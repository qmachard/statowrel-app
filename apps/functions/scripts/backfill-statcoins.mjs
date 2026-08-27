#!/usr/bin/env node
//
// Pays the StatCoins of docs/prd.md §4.7 to the accounts that earned them
// before the currency existed.
//
// The milestone payout is made by the answer trigger, in the transaction that
// moves the streak — so it only ever runs on answers given *since* the wallet
// shipped. Everybody already carrying a streak, or having run one at some point
// in the past, is owed what those streaks would have paid. This pass is what
// settles that, once.
//
//   npm run backfill-statcoins                  # default project (.firebaserc)
//   npm run backfill-statcoins -- --production
//   npm run backfill-statcoins -- --dry-run     # writes nothing, says what it would write
//
// **It replays the history rather than reading `streak_count`.** A profile
// carries the streak running *now* and the best one ever reached, and neither
// answers the question this script asks: how many milestones has this account
// crossed, over every streak it has ever run? Somebody who kept a 40-day streak
// last spring and answered nothing since carries `streak_count: 0` — and is
// owed 400§. So the answers are read back and the streak is rebuilt day by day,
// with `streakStatcoinReward` deciding each crossing exactly as the trigger
// does. The rule lives in `@statowrel/models` for this: a backfill computing a
// payout its own way is a backfill that disagrees with production.
//
// Re-runnable, and this is the property to preserve: what it credits is the
// difference between what a history owes and `statcoins_earned`, never the
// total. Run it twice and the second pass finds nothing to do; run it after the
// trigger has paid a milestone of its own and it accounts for that too. An
// account already owed nothing more is skipped rather than written.
//
// Admin SDK and not a client: `firestore.rules` denies every client write that
// moves the wallet, which is exactly what keeps a balance from being forged.
//
// Authenticates with Application Default Credentials:
//   gcloud auth application-default login
// Against the emulator, set FIRESTORE_EMULATOR_HOST=localhost:8080 instead.

import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';

import { die, resolveProjectId } from './lib/firebase-project.mjs';

const USAGE = 'Usage: npm run backfill-statcoins -- [--production | --project <id>] [--dry-run]';

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

// The collection names and the payout rule both come from the shared package
// rather than from local copies — hence the build in the npm script.
const models = await import('@statowrel/models').catch((error) => die(
  `Could not load @statowrel/models (${error.message}).\nRun \`npm run build:models\` first.`,
));

const {
  DAILY_QUESTION_ANSWER_COLLECTION,
  previousDateKey,
  streakStatcoinReward,
  USER_COLLECTION,
} = models;

initializeApp({
  projectId,
  // The emulator accepts any credential; ADC may not even be configured.
  ...(emulator ? {} : { credential: applicationDefault() }),
});

const firestore = getFirestore();

// `previousDateKey` defaults its step count, but the step is what this replay
// is about — so it is passed, and named, rather than left implicit.
const previousDayKeyOf = (dateKey) => previousDateKey(dateKey, 1);

/**
 * What one account's answers would have paid, replayed in order.
 *
 * Mirrors `nextStreakState` and the trigger's own call to
 * `streakStatcoinReward`: a day following the last one continues the streak,
 * anything further back restarts it at 1, and each milestone crossed pays.
 *
 * Late answers never reach here — a catch-up completes the calendar and leaves
 * the streak where it was (docs/prd.md §4.6), so it earns nothing.
 */
const owedFor = (dateKeys) => {
  let streak = 0;
  let lastAnsweredOn = null;
  let owed = 0;

  dateKeys.forEach((dateKey) => {
    // A day at or behind the last one counted is not a new day of the streak.
    // It cannot happen from a sorted list of distinct keys; it is here because
    // the trigger's own guard is, and the two must not diverge.
    if (lastAnsweredOn !== null && lastAnsweredOn >= dateKey) {
      return;
    }

    const previous = streak;

    streak = lastAnsweredOn === previousDayKeyOf(dateKey) ? streak + 1 : 1;
    lastAnsweredOn = dateKey;
    owed += streakStatcoinReward(previous, streak);
  });

  return owed;
};

const users = await firestore.collection(USER_COLLECTION).get().catch((error) => die(
  `Cannot read ${USER_COLLECTION} on ${projectId}: ${error.message}`,
));

console.log(`• ${users.size} account(s) in ${USER_COLLECTION} on ${projectId}${emulator ? ` (emulator ${emulator})` : ''}`);

if (users.empty) {
  console.log('✔ Nothing to do.');
  process.exit(0);
}

// One collection-group query per account — `user_id ==`, ordered by `date`,
// backed by the composite index in `packages/firestore-config`. The answers are
// the record the calendar months are derived from, so they are what a payout is
// settled against.
const settlements = [];

for (const user of users.docs) {
  const answers = await firestore
    .collectionGroup(DAILY_QUESTION_ANSWER_COLLECTION)
    .where('user_id', '==', user.id)
    .orderBy('date')
    .get()
    .catch((error) => die(
      `Cannot read the answers of ${user.id} on ${projectId}: ${error.message}`
      + '\nA collection-group query needs its index — see packages/firestore-config.',
    ));

  const dateKeys = answers.docs
    .map((answer) => answer.data())
    // The onboarding demo is answered by everybody and was never a day: it
    // carries an empty `date`, which would sort first and be replayed as one.
    // A late answer is a catch-up, which never moves a streak.
    .filter((answer) => answer.late !== true && typeof answer.date === 'string' && answer.date !== '')
    .map((answer) => answer.date);

  const owed = owedFor(dateKeys);
  const earned = user.data().statcoins_earned ?? 0;
  const delta = owed - earned;

  if (delta > 0) {
    settlements.push({ ref: user.ref, username: user.data().username ?? user.id, days: dateKeys.length, owed, earned, delta });
  }
}

console.log(`• ${settlements.length} account(s) owed StatCoins for streaks run before the currency existed`);

if (settlements.length === 0) {
  console.log('✔ Nothing to do.');
  process.exit(0);
}

const total = settlements.reduce((sum, settlement) => sum + settlement.delta, 0);

if (dryRun) {
  settlements.forEach(({ username, days, owed, earned, delta }) => console.log(
    `  + @${username} — ${days} day(s) on time, owed ${owed}§, already earned ${earned}§ → +${delta}§`,
  ));
  console.log(`✔ --dry-run: nothing was written (${total}§ would have been credited).`);
  process.exit(0);
}

for (let offset = 0; offset < settlements.length; offset += BATCH_SIZE) {
  const batch = firestore.batch();

  // `update()` and not `set()`: a whole-document write would carry back the
  // counters read a moment ago and revert whatever the answer trigger wrote in
  // between. `increment` for the same reason — the balance moves under this
  // script, and the difference is what is owed, never the total.
  //
  // update() does not run the converter (see the repo's CLAUDE.md), so
  // `updated_at` is a Timestamp and not an ISO string.
  settlements.slice(offset, offset + BATCH_SIZE).forEach(({ ref, delta }) => {
    batch.update(ref, {
      statcoin_balance: FieldValue.increment(delta),
      statcoins_earned: FieldValue.increment(delta),
      updated_at: Timestamp.now(),
    });
  });

  await batch.commit().catch((error) => die(`Batch commit failed on ${projectId}: ${error.message}`));

  console.log(`  … ${Math.min(offset + BATCH_SIZE, settlements.length)}/${settlements.length}`);
}

console.log(`✔ Credited ${total}§ across ${settlements.length} account(s) on ${projectId}.`);
