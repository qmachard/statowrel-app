#!/usr/bin/env node
//
// Fills `v1_questions` from a JSON file — the starting moderation pot, the one
// the daily draw picks from (docs/prd.md §4.7).
//
// The JSON is an array of `{ question, options: [{ label, stat_label }] }` —
// see scripts/questions.seed.json. An entry's numeric `id`, when it has one, is
// ignored: the document id is a ULID, like the one the moderation console mints.
//
//   npm run seed-questions                                  # default project (.firebaserc)
//   npm run seed-questions -- --production                  # production project (.firebaserc)
//   npm run seed-questions -- ./my-questions.json
//   npm run seed-questions -- --status pending --author <uid>
//   npm run seed-questions -- --dry-run                     # writes nothing, says what it would do
//
// The script is re-runnable: a question whose label and option labels are
// already in the collection is skipped, never rewritten — a rewrite would
// repoint the answers already recorded against its option ids.
//
// Authenticates with Application Default Credentials:
//   gcloud auth application-default login
// Against the emulator, set FIRESTORE_EMULATOR_HOST=localhost:8080 instead.

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { GeoPoint, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { ulid } from 'ulid';

const USAGE = `Usage: npm run seed-questions -- [file.json] [--production | --project <id>] [--status pending|approved] [--author <uid>] [--dry-run]`;

const SCRIPTS_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPTS_DIR, '../../..');
const DEFAULT_FILE = resolve(SCRIPTS_DIR, 'questions.seed.json');

// A Firestore batch caps at 500 operations.
const BATCH_SIZE = 400;

// A question typed in by hand has no author to credit and no verdict to carry:
// the app leaves the credit line out on an empty `author_id`, and the two
// statuses a drawn question owns — `used`, `rejected` — are not seedable.
const SEEDABLE_STATUSES = [ 'pending', 'approved' ];

const die = (message) => {
  console.error(`✖ ${message}`);
  process.exit(1);
};

const parseArgs = (argv) => {
  const parsed = { file: null, project: null, alias: 'default', status: 'approved', author: '', dryRun: false };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--dry-run') {
      parsed.dryRun = true;
    } else if (arg === '--production') {
      parsed.alias = 'production';
    } else if (arg === '--project') {
      parsed.project = argv[i += 1] ?? die(`--project needs a project id.\n${USAGE}`);
    } else if (arg === '--status') {
      parsed.status = argv[i += 1] ?? die(`--status needs a status.\n${USAGE}`);
    } else if (arg === '--author') {
      parsed.author = argv[i += 1] ?? die(`--author needs a uid.\n${USAGE}`);
    } else if (arg.startsWith('-')) {
      die(`Unknown flag "${arg}".\n${USAGE}`);
    } else if (parsed.file) {
      die(`Only one file at a time (got "${parsed.file}" and "${arg}").\n${USAGE}`);
    } else {
      parsed.file = resolve(process.cwd(), arg);
    }
  }

  if (!SEEDABLE_STATUSES.includes(parsed.status)) {
    die(`--status must be one of ${SEEDABLE_STATUSES.join(', ')} (got "${parsed.status}").\n${USAGE}`);
  }

  return { ...parsed, file: parsed.file ?? DEFAULT_FILE };
};

// The project ids live in .firebaserc so this script and `firebase use` never drift apart.
const resolveProjectId = ({ project, alias }) => {
  if (project) return project;

  let projects;
  try {
    ({ projects } = JSON.parse(readFileSync(resolve(REPO_ROOT, '.firebaserc'), 'utf-8')));
  } catch (error) {
    die(`Could not read .firebaserc (${error.message}). Pass --project <id> instead.`);
  }

  return projects?.[alias] ?? die(`No "${alias}" project in .firebaserc. Pass --project <id> instead.`);
};

const readEntries = (file) => {
  let entries;

  try {
    entries = JSON.parse(readFileSync(file, 'utf-8'));
  } catch (error) {
    die(`Could not read ${file} (${error.message}).`);
  }

  if (!Array.isArray(entries)) {
    die(`${file} must hold an array of questions.`);
  }

  return entries;
};

const isFilledString = (value) => typeof value === 'string' && value.trim() !== '';

/**
 * Rejects the whole file rather than seeding half of it: a malformed entry is a
 * typo in the JSON, not a row to drop silently.
 */
const validateEntries = (entries, { minOptions, maxOptions }) => {
  const errors = entries.flatMap((entry, index) => {
    const at = `#${index + 1}${isFilledString(entry?.question) ? ` ("${entry.question}")` : ''}`;
    const options = entry?.options;

    if (!isFilledString(entry?.question)) {
      return [ `${at}: missing "question".` ];
    }

    if (!Array.isArray(options) || options.length < minOptions || options.length > maxOptions) {
      return [ `${at}: needs between ${minOptions} and ${maxOptions} options (got ${Array.isArray(options) ? options.length : 0}).` ];
    }

    return options.flatMap((option, optionIndex) => (
      isFilledString(option?.label) && isFilledString(option?.stat_label)
        ? []
        : [ `${at}, option #${optionIndex + 1}: needs a "label" and a "stat_label".` ]
    ));
  });

  if (errors.length > 0) {
    die(`${errors.length} invalid ${errors.length === 1 ? 'entry' : 'entries'}:\n  ${errors.join('\n  ')}`);
  }
};

/**
 * What identifies a question, for this script: its label and its option labels.
 *
 * The JSON carries no key Firestore knows about — its numeric `id` is not the
 * document id — and the same label comes back with different options ("Tu
 * prends ta douche…" poses three of them). So the options are part of the key,
 * and case and spacing are out of it.
 */
const identityOf = (label, optionLabels) => (
  [ label, ...optionLabels ]
    .map((value) => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('fr-FR'))
    .join(' ⇥ ')
);

const { file, dryRun, status, author, ...selector } = parseArgs(process.argv.slice(2));
const projectId = resolveProjectId(selector);
const emulator = process.env.FIRESTORE_EMULATOR_HOST;

// The model and its converter come from the shared package rather than from a
// local copy of the document shape — hence the build in the npm script.
const models = await import('@statowrel/models').catch((error) => die(
  `Could not load @statowrel/models (${error.message}).\nRun \`npm run build:models\` first.`,
));

const {
  QUESTION_COLLECTION,
  QUESTION_MIN_OPTIONS,
  QUESTION_MAX_OPTIONS,
  questionConverter,
} = models;

const entries = readEntries(file);
validateEntries(entries, { minOptions: QUESTION_MIN_OPTIONS, maxOptions: QUESTION_MAX_OPTIONS });

initializeApp({
  projectId,
  // The emulator accepts any credential; ADC may not even be configured.
  ...(emulator ? {} : { credential: applicationDefault() }),
});

const firestore = getFirestore();
const collection = firestore.collection(QUESTION_COLLECTION);
const converter = questionConverter(Timestamp, GeoPoint);

const existing = await collection.get().catch((error) => die(
  `Cannot read ${QUESTION_COLLECTION} on ${projectId}: ${error.message}`,
));

const seen = new Set(existing.docs.map((document) => {
  const data = document.data();

  return identityOf(data.label ?? '', (data.options ?? []).map((option) => option?.label ?? ''));
}));

// One instant per question, in file order: the moderation console sorts on
// `created_at` descending, and a shared instant would make the order of the
// whole seeded batch arbitrary there.
const startedAt = Date.now();

const pending = [];
let skipped = 0;

entries.forEach((entry, index) => {
  const optionLabels = entry.options.map((option) => option.label.trim());
  const identity = identityOf(entry.question.trim(), optionLabels);

  // Holds for two identical entries *of the file* too: the first one wins.
  if (seen.has(identity)) {
    skipped += 1;

    return;
  }

  seen.add(identity);

  pending.push({
    label: entry.question.trim(),
    // One ULID per option, minted here the way the console mints one as an
    // option is typed in: an answer and its `answer_counts` entry point at it.
    options: entry.options.map((option) => ({
      id: ulid(),
      label: option.label.trim(),
      stat_label: option.stat_label.trim(),
    })),
    status,
    author_id: author,
    rejection_reason: null,
    // Everything a drawn question carries stays null: the daily scheduler owns
    // `broadcast_at` / `broadcast_on` / `closes_at`, and `answer_counts` belongs
    // to the answer trigger alone.
    broadcast_at: null,
    broadcast_on: null,
    closes_at: null,
    answer_counts: {},
    created_at: new Date(startedAt + index).toISOString(),
  });
});

console.log(`• ${file}`);
console.log(`• ${entries.length} question(s) in the file, ${existing.size} already in ${QUESTION_COLLECTION} on ${projectId}${emulator ? ` (emulator ${emulator})` : ''}`);
console.log(`• ${pending.length} to write as "${status}", ${skipped} already there`);

if (dryRun) {
  pending.forEach((question) => console.log(`  + ${question.label} — ${question.options.map((option) => option.label).join(' / ')}`));
  console.log('✔ --dry-run: nothing was written.');
  process.exit(0);
}

if (pending.length === 0) {
  console.log('✔ Nothing to do.');
  process.exit(0);
}

for (let offset = 0; offset < pending.length; offset += BATCH_SIZE) {
  const batch = firestore.batch();

  pending.slice(offset, offset + BATCH_SIZE).forEach((question) => {
    // `set()` runs the converter, unlike `update()` — it is what turns the ISO
    // `created_at` into a Timestamp (see the repo's CLAUDE.md).
    batch.set(collection.doc(ulid()), converter.toFirestore(question));
  });

  await batch.commit().catch((error) => die(`Batch commit failed on ${projectId}: ${error.message}`));

  console.log(`  … ${Math.min(offset + BATCH_SIZE, pending.length)}/${pending.length}`);
}

console.log(`✔ Wrote ${pending.length} question(s) as "${status}" into ${QUESTION_COLLECTION} on ${projectId}.`);
