#!/usr/bin/env node
//
// Fills `v1_questions` from a JSON file — the starting moderation pot.
//
// Seeded questions land as `pending`, so they go through the moderation console
// like any proposal (docs/prd.md §4.7): the daily draw only picks from the
// approved pot, so nothing goes out before someone has been through the batch.
// Pass `--status approved` to skip that pass.
//
// The JSON is an array of `{ question, options: [{ label, stat_label }] }` —
// see scripts/questions.seed.json. An entry's numeric `id`, when it has one, is
// ignored: the document id is a ULID, like the one the moderation console mints.
//
//   npm run seed-questions                                  # default project (.firebaserc)
//   npm run seed-questions -- --production                  # production project (.firebaserc)
//   npm run seed-questions -- ./my-questions.json
//   npm run seed-questions -- --status approved --author <uid>
//   npm run seed-questions -- --dry-run                     # writes nothing, says what it would do
//
// The script is re-runnable: a question whose label and option labels are
// already in the collection is skipped, never rewritten — a rewrite would
// repoint the answers already recorded against its option ids.
//
// Authenticates with Application Default Credentials:
//   gcloud auth application-default login
// Against the emulator, set FIRESTORE_EMULATOR_HOST=localhost:8080 instead.

import { resolve } from 'node:path';

import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { GeoPoint, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { ulid } from 'ulid';

import { die, resolveProjectId } from './lib/firebase-project.mjs';
import {
  DEFAULT_SEED_FILE,
  documentIdentityOf,
  entryIdentityOf,
  readSeedEntries,
  seedOptionsOf,
} from './lib/questions-seed.mjs';

const USAGE = `Usage: npm run seed-questions -- [file.json] [--production | --project <id>] [--status pending|approved] [--author <uid>] [--dry-run]`;

// A Firestore batch caps at 500 operations.
const BATCH_SIZE = 400;

// A question typed in by hand has no author to credit and no verdict to carry:
// the app leaves the credit line out on an empty `author_id`, and the two
// statuses a drawn question owns — `used`, `rejected` — are not seedable.
const SEEDABLE_STATUSES = [ 'pending', 'approved' ];

// `pending` and not `approved`: a seeded batch is a proposal like any other, and
// the moderation pass is what turns it into something the daily draw can pick.
const DEFAULT_STATUS = 'pending';

const parseArgs = (argv) => {
  const parsed = { file: null, project: null, alias: 'default', status: DEFAULT_STATUS, author: '', dryRun: false };

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

  return { ...parsed, file: parsed.file ?? DEFAULT_SEED_FILE };
};

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
  USER_COLLECTION,
  questionConverter,
} = models;

const entries = readSeedEntries(file, { minOptions: QUESTION_MIN_OPTIONS, maxOptions: QUESTION_MAX_OPTIONS });

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

// The credit is carried on the question rather than resolved at display time,
// so it is resolved here — once for the whole batch, `--author` being a single
// uid. An unknown uid credits nobody rather than stopping the seed: the pot is
// still worth writing, and the reader falls back to the profile until the
// backfill passes.
const authorUsername = author === ''
  ? null
  : await firestore.collection(USER_COLLECTION).doc(author).get()
    .then((snapshot) => snapshot.data()?.username ?? null)
    .catch((error) => die(`Cannot read ${USER_COLLECTION}/${author} on ${projectId}: ${error.message}`));

const seen = new Set(existing.docs.map((document) => documentIdentityOf(document.data())));

// One instant per question, in file order: the moderation console sorts on
// `created_at` descending, and a shared instant would make the order of the
// whole seeded batch arbitrary there.
const startedAt = Date.now();

const pending = [];
let skipped = 0;

entries.forEach((entry, index) => {
  const identity = entryIdentityOf(entry);

  // Holds for two identical entries *of the file* too: the first one wins.
  if (seen.has(identity)) {
    skipped += 1;

    return;
  }

  seen.add(identity);

  pending.push({
    label: entry.question.trim(),
    options: seedOptionsOf(entry),
    status,
    author_id: author,
    author_username: authorUsername,
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
console.log(`• ${pending.length} to write as "${status}"${authorUsername ? ` credited to @${authorUsername}` : ''}, ${skipped} already there`);

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
