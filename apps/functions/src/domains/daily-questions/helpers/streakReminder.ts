import {
  JOKER_STATFLOUZZ_COST,
  previousDateKey,
  STREAK_REMINDER_CHANNEL_ID,
  STREAK_REMINDER_MIN_STREAK,
  USER_COLLECTION,
  type UserData,
  userConverter,
} from '@statowrel/models';

import {
  type PushDeliveryReport,
  type PushNotification,
  sendPushToSomeUsers,
} from '@/domains/notifications';
import { getCollectionRef } from '@/libs/firebase-admin';

/**
 * One account the 21:00 reminder is for, and everything the message needs —
 * docs/prd.md §4.6.
 *
 * The balance travels alongside the streak because the two together decide
 * *which* of the two messages this person gets, and re-reading the profile at
 * copy time would be a second read of a document already in hand.
 */
export interface StreakAtRisk {
  user_id: string;
  streak_count: number;
  statcoin_balance: number;
}

/**
 * Every account whose streak is alive and whose day is not done — the whole
 * targeting of the last-chance reminder, in one query, before the length
 * threshold is applied.
 *
 * **`streak_last_answered_on == yesterday` is the entire condition**, and it
 * is worth spelling out why it is not three. A streak is alive only if its
 * last on-time answer was yesterday: the trigger sets that field to the day of
 * every answer and every joker, and `nextStreakState` restarts the count at 1
 * when the previous day is missing. So at 21:00 Paris:
 *
 * - somebody who answered today, or spent a joker today, carries *today* and
 *   is not in the result — which is the « déjà répondu » and « déjà posé son
 *   joker » exclusions, for free, with no read of the answers at all;
 * - somebody whose streak broke last week carries a stale `streak_count` (it
 *   is only recomputed on their next answer) but an old `streak_last_answered_on`,
 *   so they are not in the result either — a 40 sitting on a dead streak must
 *   never be told it is at risk;
 * - somebody who has never answered carries `null`.
 *
 * Reading the day's answers instead would have inverted the cost: the whole
 * user base minus the answerers, rather than the handful of people the
 * reminder is actually for. This query is served by the automatic single-field
 * index — no composite index to deploy, and nothing in
 * `firestore.indexes.json` to keep in step.
 *
 * `streak_count` is filtered in memory by `streaksAtRisk` below rather than in
 * the query: pairing an equality with a range costs a composite index, and the
 * documents it would spare are the short streaks of people who are answering
 * daily — a small, self-limiting set. The read is the cost either way.
 *
 * Nothing here looks at `late`: an answer is only ever `late` past Paris
 * midnight, and this runs three hours before that.
 */
export const streakReminderCandidates = async (dateKey: string): Promise<StreakAtRisk[]> => {
  const snapshot = await getCollectionRef(USER_COLLECTION, userConverter)
    .where('streak_last_answered_on', '==', previousDateKey(dateKey))
    .get();

  return snapshot.docs.map((document) => {
    const user: UserData = document.data();

    return {
      user_id: document.id,
      streak_count: user.streak_count,
      statcoin_balance: user.statcoin_balance,
    };
  });
};

/**
 * The candidates whose streak is long enough to be worth a third push —
 * `STREAK_REMINDER_MIN_STREAK`, and the reasoning for that number is on the
 * constant.
 *
 * Split from the query above so that `npm run run-streak-reminder --dry-run`
 * can show the two sets against each other: whoever is being reminded, and
 * whoever the threshold spared. An exclusion nobody can see and a reminder
 * that failed to send look the same from the outside, and only one of them is
 * a bug.
 */
export const streaksAtRisk = async (dateKey: string): Promise<StreakAtRisk[]> => (
  (await streakReminderCandidates(dateKey))
    .filter((candidate) => candidate.streak_count >= STREAK_REMINDER_MIN_STREAK)
);

/**
 * What the reminder says, and what a tap on it does.
 *
 * The title carries the number, because the number *is* the message: « ta
 * série » is a category, « ta série de 23 jours » is a loss. The body then
 * says the two things the title cannot — the deadline, and the way out — and
 * repeats none of it.
 *
 * **Two variants, decided by the wallet.** A joker costs
 * `JOKER_STATFLOUZZ_COST`, and offering one to somebody who cannot pay for it
 * turns a rescue into an ad for a currency they do not have. So a short wallet
 * is simply invited to answer, and never sees a price. The deep link follows
 * the same split: `intent: 'joker'` opens the confirmation straight away, and
 * is only ever sent to somebody who can go through with it.
 *
 * The price is not in the body either, even for the accounts that can pay: the
 * confirmation the tap opens states it in full, one screen later, and a
 * notification carrying two numbers makes neither of them the point.
 *
 * Nothing here says « 21h ». The deadline is midnight, which is a fact about
 * the day; the hour this is sent at is the app's business.
 */
export const streakReminderFor = (atRisk: StreakAtRisk, dateKey: string): PushNotification => {
  const affordable = atRisk.statcoin_balance >= JOKER_STATFLOUZZ_COST;

  return {
    title: `Ta série de ${atRisk.streak_count} jours va casser`,
    body: affordable
      ? 'Réponds avant minuit, ou pose un Joker pour la sauver.'
      : 'Il te reste jusqu\'à minuit pour répondre.',
    channelId: STREAK_REMINDER_CHANNEL_ID,
    data: {
      type: 'daily_question',
      date: dateKey,
      ...(affordable ? { intent: 'joker' } : {}),
    },
  };
};

/**
 * Selects tonight's at-risk accounts and pushes each of them their own line —
 * the whole of the 21:00 reminder, in one exported function.
 *
 * Select *and* send together, rather than leaving the task to join the two,
 * because this is also what `npm run run-streak-reminder` calls: an ops script
 * cannot import TypeScript, so the only way to check the targeting against a
 * seeded emulator without writing a second implementation of it is to bundle
 * this file and call it (`scripts/lib/load-src.mjs`, the trick the Instagram
 * preview already uses). A rule verified against a copy of itself is not
 * verified.
 *
 * The task on top of it (`tasks/notifyStreakReminder.ts`) is then what it
 * should be: payload validation, a call, and a log line.
 *
 * A quiet night is a normal night — an evening where everybody answered ends
 * here, having sent nothing.
 */
export const sendStreakReminders = async (
  dateKey: string,
): Promise<PushDeliveryReport & { at_risk: number }> => {
  const atRisk = await streaksAtRisk(dateKey);

  if (atRisk.length === 0) {
    return { at_risk: 0, sent: 0, failed: 0, pruned: 0 };
  }

  const lines = new Map(atRisk.map((user) => [ user.user_id, streakReminderFor(user, dateKey) ]));

  const report = await sendPushToSomeUsers(
    atRisk.map((user) => user.user_id),
    (userId) => lines.get(userId) ?? null,
  );

  return { at_risk: atRisk.length, ...report };
};
