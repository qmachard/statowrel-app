#!/usr/bin/env node
//
// Writes the one question the onboarding carousel poses — `DEMO_QUESTION_ID` in
// `@statowrel/models`, a fixed document id so the app reads a single document
// and `firestore.rules` can open it up by status alone.
//
// A demo question sits outside the moderation lifecycle: it is never approved
// and never drawn (the daily draw reads the `approved` pot). It does take
// answers — `firestore.rules` lets one through on its `status`, and the pick
// made in the carousel is written at the first sign-in — but it starts with
// none, and the first visitors would land on « Comme 100% des gens… », which
// reads as a bug rather than as a demo. Hence the tally seeded here.
//
//   npm run seed-demo-question                       # default project (.firebaserc)
//   npm run seed-demo-question -- --production
//   npm run seed-demo-question -- --answers 2500     # a bigger fabricated tally
//   npm run seed-demo-question -- --dry-run          # writes nothing, says what it would do
//
// Re-runnable, and non-destructive in both directions: a document already there
// keeps its wording and its options — only its status is moved to `demo` — and
// a tally it already carries is never overwritten. A question that has been
// broadcast is refused outright: turning a day of the calendar into the demo
// would leave that day pointing at a question nobody can read as a day.
//
// Authenticates with Application Default Credentials:
//   gcloud auth application-default login
// Against the emulator, set FIRESTORE_EMULATOR_HOST=localhost:8080 instead.

import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { GeoPoint, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { ulid } from 'ulid';

import { die, resolveProjectId } from './lib/firebase-project.mjs';
import { DEMO_ANSWERS, DEMO_QUESTION, fabricateAnswerCounts } from './lib/questions-seed.mjs';

const USAGE = 'Usage: npm run seed-demo-question -- [--answers <n>] [--production | --project <id>] [--dry-run]';

const parseArgs = (argv) => {
  const parsed = { project: null, alias: 'default', answers: DEMO_ANSWERS, dryRun: false };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--dry-run') {
      parsed.dryRun = true;
    } else if (arg === '--production') {
      parsed.alias = 'production';
    } else if (arg === '--project') {
      parsed.project = argv[i += 1] ?? die(`--project needs a project id.\n${USAGE}`);
    } else if (arg === '--answers') {
      const value = Number(argv[i += 1]);

      if (!Number.isInteger(value) || value < 0) {
        die(`--answers needs a positive integer.\n${USAGE}`);
      }

      parsed.answers = value;
    } else {
      die(`Unknown argument "${arg}".\n${USAGE}`);
    }
  }

  return parsed;
};

const { answers, dryRun, ...selector } = parseArgs(process.argv.slice(2));
const projectId = resolveProjectId(selector);
const emulator = process.env.FIRESTORE_EMULATOR_HOST;

// The model and its converter come from the shared package rather than from a
// local copy of the document shape — hence the build in the npm script.
const models = await import('@statowrel/models').catch((error) => die(
  `Could not load @statowrel/models (${error.message}).\nRun \`npm run build:models\` first.`,
));

const { DEMO_QUESTION_ID, QUESTION_COLLECTION, questionConverter } = models;

initializeApp({
  projectId,
  // The emulator accepts any credential; ADC may not even be configured.
  ...(emulator ? {} : { credential: applicationDefault() }),
});

const firestore = getFirestore();
const converter = questionConverter(Timestamp, GeoPoint);
const ref = firestore.collection(QUESTION_COLLECTION).doc(DEMO_QUESTION_ID);

const snapshot = await ref.get().catch((error) => die(
  `Cannot read ${QUESTION_COLLECTION}/${DEMO_QUESTION_ID} on ${projectId}: ${error.message}`,
));

const existing = snapshot.exists ? snapshot.data() : null;

console.log(`• ${QUESTION_COLLECTION}/${DEMO_QUESTION_ID} on ${projectId}${emulator ? ` (emulator ${emulator})` : ''}`);

if (existing?.broadcast_at) {
  die('That question has already been broadcast as a daily question — pick another id for the demo.');
}

const options = existing?.options?.length
  ? existing.options
  : DEMO_QUESTION.options.map((option) => ({ id: ulid(), ...option }));

// Only ever seeded on an empty map: a tally already there is either a real one
// or a previous run's, and neither is worth reshuffling under a demo people
// have already been shown.
const hasCounts = Object.keys(existing?.answer_counts ?? {}).length > 0;
const counts = hasCounts ? null : fabricateAnswerCounts(options, answers);

const label = existing?.label ?? DEMO_QUESTION.label;

console.log(`• « ${label} » — ${options.map((option) => option.label).join(' / ')}`);
console.log(existing === null
  ? `• creating it as "demo"${counts ? ` with ${answers} fabricated answers` : ''}`
  : `• already there as "${existing.status}" — moving it to "demo"${counts ? `, seeding ${answers} fabricated answers` : ', keeping its tally'}`);

if (dryRun) {
  console.log('✔ --dry-run: nothing was written.');
  process.exit(0);
}

if (existing === null) {
  // `set()` runs the converter, unlike `update()` — it is what turns the ISO
  // `created_at` into a Timestamp (see the repo's CLAUDE.md).
  await ref.set(converter.toFirestore({
    label,
    options,
    status: 'demo',
    // The sample belongs to nobody: no author to credit, so no handle to carry.
    author_id: '',
    author_username: null,
    rejection_reason: null,
    // A demo question is never a day: everything the daily cycle owns stays
    // null. Its answers carry an empty `date` and `late: false` rather than a
    // day of anybody's calendar — see `isAnswerToDemo` in `firestore.rules`.
    broadcast_at: null,
    broadcast_on: null,
    closes_at: null,
    answer_counts: counts ?? {},
    created_at: new Date().toISOString(),
  })).catch((error) => die(`Write failed on ${projectId}: ${error.message}`));
} else {
  await ref.update({
    status: 'demo',
    ...(counts ? { answer_counts: counts } : {}),
  }).catch((error) => die(`Update failed on ${projectId}: ${error.message}`));
}

console.log(`✔ ${QUESTION_COLLECTION}/${DEMO_QUESTION_ID} is the onboarding demo question on ${projectId}.`);
