#!/usr/bin/env node
//
// Fills `v1_questions.author_username` on the questions written before the
// field existed — the credit of docs/prd.md §5.4, carried on the question so
// naming its author costs no profile read.
//
// The app and the moderation console both fall back to reading
// `v1_users/{author_id}` while the copy is missing, so this script is what ends
// that fallback: until it has run in production, opening a day still bills one
// read per credit, and the console one per distinct author of the pot.
//
//   npm run backfill-question-authors                # default project (.firebaserc)
//   npm run backfill-question-authors -- --production
//   npm run backfill-question-authors -- --dry-run   # writes nothing, says what it would write
//
// Admin SDK and not a client: `firestore.rules` denies every `update` on a
// question to every client (`allow update, delete: if false`), which is exactly
// what keeps the copy from being forged.
//
// Re-runnable: a question already carrying a handle is left alone, and each
// distinct author is resolved once whatever the size of their back catalogue.
// A question with no author, or one whose author's profile is gone, is skipped
// rather than stamped — there is nothing to credit, and a null is what the
// document already says.
//
// Authenticates with Application Default Credentials:
//   gcloud auth application-default login
// Against the emulator, set FIRESTORE_EMULATOR_HOST=localhost:8080 instead.

import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

import { die, resolveProjectId } from './lib/firebase-project.mjs';

const USAGE = 'Usage: npm run backfill-question-authors -- [--production | --project <id>] [--dry-run]';

// A Firestore batch caps at 500 operations.
const BATCH_SIZE = 400;

const parseArgs = (argv) => {
  const parsed = { project: null, alias: 'default', dryRun: false };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--dry-run') {
      parsed.dryRun = true;
    } else if (arg === '--production') {
      parsed.alias = 'production';
    } else if (arg === '--project') {
      parsed.project = argv[i += 1] ?? die(`--project needs a project id.\n${USAGE}`);
    } else {
      die(`Unknown argument "${arg}".\n${USAGE}`);
    }
  }

  return parsed;
};

const { dryRun, ...selector } = parseArgs(process.argv.slice(2));
const projectId = resolveProjectId(selector);
const emulator = process.env.FIRESTORE_EMULATOR_HOST;

// The collection names come from the shared package rather than from local
// string literals — hence the build in the npm script.
const models = await import('@statowrel/models').catch((error) => die(
  `Could not load @statowrel/models (${error.message}).\nRun \`npm run build:models\` first.`,
));

const { QUESTION_COLLECTION, USER_COLLECTION } = models;

initializeApp({
  projectId,
  // The emulator accepts any credential; ADC may not even be configured.
  ...(emulator ? {} : { credential: applicationDefault() }),
});

const firestore = getFirestore();

const questions = await firestore.collection(QUESTION_COLLECTION).get().catch((error) => die(
  `Cannot read ${QUESTION_COLLECTION} on ${projectId}: ${error.message}`,
));

console.log(`• ${questions.size} question(s) in ${QUESTION_COLLECTION} on ${projectId}${emulator ? ` (emulator ${emulator})` : ''}`);

// Read through the raw document rather than through the converter: the
// converter defaults a missing `author_username` to null, which is the value a
// backfilled question legitimately carries — and this pass has to tell "never
// written" from "written as nothing" to stay re-runnable.
const missing = questions.docs.filter((document) => {
  const data = document.data();

  return data.author_username == null && typeof data.author_id === 'string' && data.author_id !== '';
});

const authorIds = [ ...new Set(missing.map((document) => document.data().author_id)) ];

console.log(`• ${missing.length} without a handle, ${authorIds.length} distinct author(s) to resolve`);

if (missing.length === 0) {
  console.log('✔ Nothing to do.');
  process.exit(0);
}

// One read per distinct author, however many questions they wrote — the whole
// point of the copy being written here rather than resolved at display time.
const usernames = new Map(await Promise.all(authorIds.map(async (authorId) => {
  const snapshot = await firestore.collection(USER_COLLECTION).doc(authorId).get().catch((error) => die(
    `Cannot read ${USER_COLLECTION}/${authorId} on ${projectId}: ${error.message}`,
  ));

  return [ authorId, snapshot.data()?.username ?? null ];
})));

const pending = missing
  .map((document) => ({ document, username: usernames.get(document.data().author_id) ?? null }))
  .filter(({ username }) => username !== null);

const orphans = missing.length - pending.length;

console.log(`• ${pending.length} to stamp, ${orphans} left alone (author profile gone)`);

if (dryRun) {
  pending.forEach(({ document, username }) => console.log(`  + ${document.id} → @${username} — ${document.data().label ?? ''}`));
  console.log('✔ --dry-run: nothing was written.');
  process.exit(0);
}

for (let offset = 0; offset < pending.length; offset += BATCH_SIZE) {
  const batch = firestore.batch();

  // `update()` and not `set()`: a whole-document write would carry back the
  // `answer_counts` and the broadcast stamps read a moment ago and revert
  // whatever the backend wrote in between. `updated_at` is left alone too —
  // this pass is not a moderator's edit, and stamping it would make every
  // question look freshly edited in the console's « dernière modification ».
  pending.slice(offset, offset + BATCH_SIZE).forEach(({ document, username }) => {
    batch.update(document.ref, { author_username: username });
  });

  await batch.commit().catch((error) => die(`Batch commit failed on ${projectId}: ${error.message}`));

  console.log(`  … ${Math.min(offset + BATCH_SIZE, pending.length)}/${pending.length}`);
}

console.log(`✔ Stamped ${pending.length} question(s) with their author's handle on ${projectId}.`);
