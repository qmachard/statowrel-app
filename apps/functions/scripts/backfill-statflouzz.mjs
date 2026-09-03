#!/usr/bin/env node
//
// Rebuilds each account's streak counters from its answers, and pays the
// StatFlouzz of docs/prd.md §4.7 that those streaks earned before the currency
// existed.
//
//   npm run backfill-statflouzz                  # default project (.firebaserc)
//   npm run backfill-statflouzz -- --production
//   npm run backfill-statflouzz -- --dry-run     # writes nothing, reports every account
//
// Two jobs, one replay, because they are the same computation. The milestone
// payout is made by the answer trigger in the transaction that moves the
// streak, so it only ever runs on answers given *since* the wallet shipped;
// everybody already running streaks is owed what those streaks would have paid.
// And the counters that payout is owed against — `streak_count`, `streak_best`,
// `answers_count`, `streak_last_answered_on` — are themselves derived values a
// trigger has been incrementing one answer at a time, which drift: a profile
// carrying 18 answers, a best streak of 17 and a current streak of 12 is
// describing 29 days it does not have.
//
// **The answers are the record.** They are what the calendar months, the
// counters and the wallet are all derived from, so they are what everything
// here is settled against — the streak is rebuilt day by day, with
// `streakStatflouzzReward` deciding each milestone exactly as the trigger does.
// The rule lives in `@statowrel/models` for that reason: a backfill computing a
// payout its own way is a backfill that disagrees with production.
//
// Reading `streak_count` instead would not do even for the payout alone. A
// profile carries the streak running *now* and the best one ever reached, and
// neither answers the question this script asks: how many milestones has this
// account crossed, over every streak it has ever run? Somebody who kept a
// 40-day streak last spring and answered nothing since carries
// `streak_count: 0` — and is owed 400§.
//
// Re-runnable, and this is the property to preserve: the wallet is credited the
// difference between what a history owes and `statcoins_earned`, never the
// total, and a counter already holding its replayed value is not written. Run
// it twice and the second pass finds nothing to do; run it after the trigger
// has paid a milestone of its own and it accounts for that too.
//
// `--dry-run` reports **every** account, not only the ones it would touch: an
// account it passes over has to say why — no answers found at all, answers that
// bought nothing, or a debt the trigger has already settled. Those three read
// identically from the outside, and only one of them is a problem.
//
// Admin SDK and not a client: `firestore.rules` denies every client write that
// moves the wallet or the counters, which is exactly what keeps them from being
// forged.
//
// Authenticates with Application Default Credentials:
//   gcloud auth application-default login
// Against the emulator, set FIRESTORE_EMULATOR_HOST=localhost:8080 instead.

import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';

import { die, resolveProjectId } from './lib/firebase-project.mjs';

const USAGE = 'Usage: npm run backfill-statflouzz -- [--production | --project <id>] [--dry-run]';

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
  QUESTION_COLLECTION,
  streakStatflouzzReward,
  USER_COLLECTION,
} = models;

initializeApp({
  projectId,
  // The emulator accepts any credential; ADC may not even be configured.
  ...(emulator ? {} : { credential: applicationDefault() }),
});

const firestore = getFirestore();

/**
 * Milliseconds off whatever a raw read hands back — a `Timestamp` on a document
 * written through a converter, an ISO string on one written by a raw `update()`
 * before the converters covered it (see the repo's CLAUDE.md).
 */
const toMillis = (value) => {
  if (value == null) {
    return null;
  }

  if (typeof value.toMillis === 'function') {
    return value.toMillis();
  }

  const parsed = Date.parse(value);

  return Number.isNaN(parsed) ? null : parsed;
};

/**
 * The day a question ran and the instant it closed, read once per question
 * however many answers point at it.
 *
 * This exists for the accounts this script is *for*. `date` and `late` were
 * added to the answer model after the first answers were written, so the oldest
 * histories — exactly the ones carrying streaks that predate the currency —
 * hold answers without them. Dropping those would take a whole history down in
 * silence and report the account as owing nothing, which is the one wrong
 * answer this script can give. So a missing field is resolved from the parent
 * question instead: `broadcast_on` *is* the day, and `closes_at` is what `late`
 * was decided against in the first place.
 */
const questions = new Map();

const questionOf = async (questionId) => {
  if (questionId === null || questionId === undefined || questionId === '') {
    return null;
  }

  if (!questions.has(questionId)) {
    const snapshot = await firestore.collection(QUESTION_COLLECTION).doc(questionId).get().catch((error) => die(
      `Cannot read ${QUESTION_COLLECTION}/${questionId} on ${projectId}: ${error.message}`,
    ));

    questions.set(questionId, snapshot.data() ?? null);
  }

  return questions.get(questionId);
};

/**
 * One answer as this replay needs it: the day it counted for, and whether it
 * was a catch-up. `null` for an answer that counted for no day at all — the
 * onboarding demo, or a question that was never broadcast.
 */
const readAnswer = async (document) => {
  const answer = document.data();
  // `question_id` is denormalized on the answer; the path is the fallback for a
  // document written before it was.
  const questionId = answer.question_id ?? document.ref.parent.parent?.id ?? null;
  const dated = typeof answer.date === 'string' && answer.date !== '';

  let day = dated ? answer.date : null;

  if (day === null) {
    const question = await questionOf(questionId);

    if (question === null || question.status === 'demo') {
      return null;
    }

    day = typeof question.broadcast_on === 'string' && question.broadcast_on !== '' ? question.broadcast_on : null;

    if (day === null) {
      return null;
    }
  }

  if (typeof answer.late === 'boolean') {
    return { day, late: answer.late, recovered: !dated };
  }

  const question = await questionOf(questionId);
  const closesAt = toMillis(question?.closes_at);
  const answeredAt = toMillis(answer.answered_at);

  // Neither instant known: the answer is taken as on time. It is the reading
  // that credits rather than the one that silently withholds, and this branch
  // only ever covers documents old enough to predate both fields.
  return { day, late: closesAt !== null && answeredAt !== null && answeredAt > closesAt, recovered: true };
};

/**
 * Everything one account's answers add up to, replayed in day order.
 *
 * Mirrors `nextStreakState` and the trigger's own call to
 * `streakStatflouzzReward`: a day following the last one continues the streak,
 * anything further back restarts it at 1, and each milestone crossed pays. A
 * catch-up answer completes the calendar and leaves the streak where it was
 * (docs/prd.md §4.6), so it counts towards `answers_count` and nothing else.
 *
 * `streak` comes back as the trigger would have left it — the run ending on the
 * last on-time day, alive or not. Whether it is still alive is the app's
 * reading (`resolveStreakCount`) and not a stored value: the midnight scheduler
 * that would zero it does not exist yet.
 */
const replay = (entries) => {
  const onTime = entries.filter((entry) => !entry.late).map((entry) => entry.day).sort();

  let streak = 0;
  let best = 0;
  let lastAnsweredOn = null;
  let owed = 0;

  onTime.forEach((day) => {
    // A day at or behind the last one counted is not a new day of the streak.
    // It cannot happen from a sorted list of distinct days; it is here because
    // the trigger's own guard is, and the two must not diverge.
    if (lastAnsweredOn !== null && lastAnsweredOn >= day) {
      return;
    }

    const previous = streak;

    streak = lastAnsweredOn === previousDateKey(day, 1) ? streak + 1 : 1;
    best = Math.max(best, streak);
    lastAnsweredOn = day;
    owed += streakStatflouzzReward(previous, streak);
  });

  return {
    // Catch-ups included: the tile rewards the collection, not the regularity.
    answersCount: entries.length,
    onTimeDays: onTime.length,
    streak,
    best,
    lastAnsweredOn,
    owed,
  };
};

const users = await firestore.collection(USER_COLLECTION).get().catch((error) => die(
  `Cannot read ${USER_COLLECTION} on ${projectId}: ${error.message}`,
));

console.log(`• ${users.size} account(s) in ${USER_COLLECTION} on ${projectId}${emulator ? ` (emulator ${emulator})` : ''}`);

if (users.empty) {
  console.log('✔ Nothing to do.');
  process.exit(0);
}

// One collection-group query per account, on `user_id` alone — the days are
// sorted in the replay rather than by an `orderBy('date')`, for two reasons
// that both bite in production and neither in the emulator. An `orderBy`
// silently drops every document missing the field it orders on, which is
// precisely the legacy answer this script has to recover; and the pairing needs
// its own composite index, which would turn an undeployed
// `firestore.indexes.json` into a failure of *this* script. An equality on
// `user_id` needs only the field override `users-deleteAccount` already
// depends on.
const audit = [];

for (const user of users.docs) {
  const answers = await firestore
    .collectionGroup(DAILY_QUESTION_ANSWER_COLLECTION)
    .where('user_id', '==', user.id)
    .get()
    .catch((error) => die(
      `Cannot read the answers of ${user.id} on ${projectId}: ${error.message}`
      + '\nA collection-group equality needs its field override — see packages/firestore-config.',
    ));

  const entries = (await Promise.all(answers.docs.map(readAnswer))).filter((entry) => entry !== null);
  const replayed = replay(entries);
  const profile = user.data();

  const earned = profile.statcoins_earned ?? 0;
  const delta = replayed.owed - earned;

  // Only what actually moves is written. The wallet is incremented — it moves
  // under this script, and what is owed is the difference — while the counters
  // are absolute: they are derived from the answers rather than accumulated, so
  // the replayed value *is* the value.
  const changes = {};

  if (delta > 0) {
    changes.statcoin_balance = FieldValue.increment(delta);
    changes.statcoins_earned = FieldValue.increment(delta);
  }

  const moved = [
    [ 'answers_count', replayed.answersCount, profile.answers_count ?? 0 ],
    [ 'streak_count', replayed.streak, profile.streak_count ?? 0 ],
    [ 'streak_best', replayed.best, profile.streak_best ?? 0 ],
    [ 'streak_last_answered_on', replayed.lastAnsweredOn, profile.streak_last_answered_on ?? null ],
  ].filter(([ , next, current ]) => next !== current);

  moved.forEach(([ field, next ]) => { changes[field] = next; });

  audit.push({
    ref: user.ref,
    username: profile.username ?? user.id,
    answers: answers.size,
    counted: entries.length,
    recovered: entries.filter((entry) => entry.recovered).length,
    onTimeDays: replayed.onTimeDays,
    owed: replayed.owed,
    earned,
    delta,
    moved,
    changes,
    touched: Object.keys(changes).length > 0,
  });
}

const settlements = audit.filter(({ touched }) => touched);
const credited = settlements.reduce((sum, settlement) => sum + Math.max(settlement.delta, 0), 0);

console.log(`• ${settlements.length} account(s) to settle — ${credited}§ owed in total`);

// Every account, not only the ones being written: « nothing owed » and « no
// answers found » look the same from the outside, and only one of them means
// the script is not seeing what it should.
if (dryRun) {
  audit.forEach(({ username, answers, counted, recovered, onTimeDays, owed, earned, delta, moved }) => {
    const wallet = delta > 0 ? `+${delta}§` : (owed === 0 ? 'nothing owed' : `settled (${earned}§ earned)`);

    console.log(`  · @${username} — ${answers} answer(s), ${counted} on a day, ${onTimeDays} on time → ${wallet}`);

    if (recovered > 0) {
      console.log(`      ${recovered} predate \`date\`/\`late\` — read off their question instead`);
    }

    moved.forEach(([ field, next, current ]) => console.log(`      ${field}: ${current} → ${next}`));
  });
}

if (settlements.length === 0) {
  console.log('✔ Nothing to do.');
  process.exit(0);
}

if (dryRun) {
  console.log('✔ --dry-run: nothing was written.');
  process.exit(0);
}

for (let offset = 0; offset < settlements.length; offset += BATCH_SIZE) {
  const batch = firestore.batch();

  // `update()` and not `set()`: a whole-document write would carry back the
  // profile fields read a moment ago and revert whatever the user or the
  // trigger wrote in between.
  //
  // update() does not run the converter (see the repo's CLAUDE.md), so
  // `updated_at` is a Timestamp and not an ISO string.
  settlements.slice(offset, offset + BATCH_SIZE).forEach(({ ref, changes }) => {
    batch.update(ref, { ...changes, updated_at: Timestamp.now() });
  });

  await batch.commit().catch((error) => die(`Batch commit failed on ${projectId}: ${error.message}`));

  console.log(`  … ${Math.min(offset + BATCH_SIZE, settlements.length)}/${settlements.length}`);
}

console.log(`✔ Settled ${settlements.length} account(s) on ${projectId} — ${credited}§ credited.`);
