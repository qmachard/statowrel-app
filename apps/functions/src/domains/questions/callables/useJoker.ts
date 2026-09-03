import { FieldValue, Timestamp, type UpdateData } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import {
  DAILY_QUESTION_ANSWER_COLLECTION,
  DAILY_QUESTION_JOKER_COLLECTION,
  dailyQuestionAnswerConverter,
  dailyQuestionDateKey,
  dailyQuestionJokerConverter,
  JOKER_STATFLOUZZ_COST,
  monthDayKeyOf,
  monthKeyOf,
  QUESTION_COLLECTION,
  questionConverter,
  streakStatflouzzReward,
  USER_CALENDAR_MONTH_COLLECTION,
  USER_COLLECTION,
  userCalendarMonthConverter,
  userConverter,
  type UseJokerResult,
  type UserFirebaseData,
} from '@statowrel/models';
import { z } from 'zod';

import { REGION_CLOUD, getDocumentRef, getSubDocumentRef, runTransaction } from '@/libs/firebase-admin';

import { fanOutFriendAnswerBadge } from '../../daily-questions/helpers/friendsAnswers';
import { nextStreakState } from '../../daily-questions/helpers/streak';

/**
 * Same untrusted-input discipline as `proposeQuestion`: a callable is untrusted
 * even when the ID token rides along, and `.safeParse` never `.parse`.
 */
const payloadSchema = z.object({
  question_id: z.string().min(1),
});

/**
 * Spending a joker — docs/prd.md §4.8.
 *
 * A callable, and the only door — for the same reason `proposeQuestion` is:
 * the debit and the projection into the user's calendar month must be one
 * operation, otherwise a wallet could be emptied without the day being marked
 * or a day could be marked without paying. The rules deny any client write on
 * `v1_user_calendar_months` and on `v1_daily_question_jokers`; this function
 * runs admin-side, past them.
 *
 * What it refuses, and with which code — the app translates them one by one
 * (`apps/app/src/daily-question/data/errors.ts`):
 *
 * - `unauthenticated` — no session. A joker is spent by somebody.
 * - `invalid-argument` — a payload the shape above rejects.
 * - `not-found` — no profile document, no question document.
 * - `failed-precondition` — every reason the spend cannot happen right now:
 *   the question is not today's, the wallet is short of `JOKER_STATFLOUZZ_COST`,
 *   the user has already answered today, or the user has already spent a
 *   joker on today's question. All under one code because they share the same
 *   shape from the app's point of view — the sheet closes on the right
 *   sentence, keyed on the message.
 *
 * Four writes in one transaction:
 *
 * 1. The joker document `v1_questions/{qid}/v1_daily_question_jokers/{uid}` —
 *    the source of truth (mirrors the answer's own document), what the 18:00
 *    nudge reads to know the user has done their day.
 * 2. The day's entry in the user's calendar month — the calendar's fifth
 *    visual state (docs/prd.md §5.2), keyed on `jokers.{DD}`.
 * 3. The user's streak — advanced exactly as an on-time answer advances it
 *    (`nextStreakState`), a joker preserving the series being the whole point
 *    of the feature.
 * 4. The wallet — debit `-JOKER_STATFLOUZZ_COST`, plus the milestone payout if
 *    the streak just crossed one, so a joker earns the reward the milestone
 *    it triggered is owed.
 *
 * The friend fan-out sits outside the transaction, on purpose — same trade as
 * `onAnswerCreated`, see `fanOutFriendAnswerBadge`.
 */
export const useJoker = onCall<unknown, Promise<UseJokerResult>>(
  { region: REGION_CLOUD },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in to use a joker.');
    }

    const payload = payloadSchema.safeParse(request.data);

    if (!payload.success) {
      throw new HttpsError('invalid-argument', 'That is not a valid joker request.');
    }

    const userId = request.auth.uid;
    const { question_id: questionId } = payload.data;
    const today = dailyQuestionDateKey(new Date());
    const monthKey = monthKeyOf(today);
    const monthDayKey = monthDayKeyOf(today);

    const userRef = getDocumentRef(USER_COLLECTION, userId, userConverter);
    const questionRef = getDocumentRef(QUESTION_COLLECTION, questionId, questionConverter);
    const jokerRef = getSubDocumentRef(questionRef, DAILY_QUESTION_JOKER_COLLECTION, userId, dailyQuestionJokerConverter);
    const answerRef = getSubDocumentRef(questionRef, DAILY_QUESTION_ANSWER_COLLECTION, userId, dailyQuestionAnswerConverter);
    const calendarMonthRef = getSubDocumentRef(userRef, USER_CALENDAR_MONTH_COLLECTION, monthKey, userCalendarMonthConverter);

    const balance = await runTransaction(async (transaction) => {
      // Every read first: a transaction refuses to read after it has written.
      const [ userSnap, questionSnap, jokerSnap, answerSnap ] = await Promise.all([
        transaction.get(userRef),
        transaction.get(questionRef),
        transaction.get(jokerRef),
        transaction.get(answerRef),
      ]);

      const user = userSnap.data();

      if (user === undefined) {
        throw new HttpsError('not-found', 'No profile for this account.');
      }

      const question = questionSnap.data();

      if (question === undefined) {
        throw new HttpsError('not-found', 'This question does not exist.');
      }

      // Aujourd'hui uniquement — the joker is spent on the still-open day, not
      // on a past missed one. Checked against Paris midnight, the same clock
      // every `broadcast_on` is stamped in.
      if (question.broadcast_on !== today) {
        throw new HttpsError('failed-precondition', 'This is not today\'s question.');
      }

      // Refuse a joker on a day already answered: nothing to skip, and the
      // calendar would carry both `days.{DD}` and `jokers.{DD}` — the model
      // documents that as impossible.
      if (answerSnap.exists) {
        throw new HttpsError('failed-precondition', 'You have already answered today.');
      }

      if (jokerSnap.exists) {
        throw new HttpsError('failed-precondition', 'You have already used a joker today.');
      }

      if (user.statcoin_balance < JOKER_STATFLOUZZ_COST) {
        throw new HttpsError('failed-precondition', 'Not enough StatFlouzz for a joker.');
      }

      const now = Timestamp.now();

      // The source-of-truth joker document — mirrors the answer's own shape.
      transaction.set(jokerRef, {
        user_id: userId,
        question_id: questionId,
        date: today,
        used_at: now.toDate().toISOString(),
      });

      // The calendar's fifth visual state, in the map that carries them. Merge
      // rather than overwriting the month, since a joker never touches `days`
      // or the friend counters.
      transaction.set(calendarMonthRef, {
        month: monthKey,
        // A minimal shape, filled by the converter — same discipline as the
        // rest of the file, and the reason a whole `UserCalendarMonthData` is
        // not needed here.
        days: {},
        friend_answer_counts: {},
        jokers: { [monthDayKey]: { used_at: now.toDate().toISOString() } },
        updated_at: now.toDate().toISOString(),
      }, { merge: true });

      // A joker advances the streak exactly like an on-time answer — the
      // whole point of docs/prd.md §4.8. Reuses the same helper so the two
      // paths cannot drift.
      const streak = nextStreakState(user, today);
      const reward = streakStatflouzzReward(user.streak_count, streak.streak_count);

      // Wallet debit and the milestone credit in one write — same shape as
      // `proposeQuestion` and `onAnswerCreated`, `increment` so a concurrent
      // trigger cannot carry back a stale balance. update() does not run the
      // converter (see the repo's CLAUDE.md), so `updated_at` is written as a
      // Timestamp here rather than as an ISO string.
      const counters: UpdateData<UserFirebaseData> = {
        statcoin_balance: FieldValue.increment(-JOKER_STATFLOUZZ_COST + reward),
        statcoins_spent: FieldValue.increment(JOKER_STATFLOUZZ_COST),
        ...(reward > 0 ? { statcoins_earned: FieldValue.increment(reward) } : {}),
        streak_count: streak.streak_count,
        streak_best: streak.streak_best,
        streak_last_answered_on: streak.streak_last_answered_on,
        updated_at: now,
      };

      transaction.update(userRef, counters);

      return user.statcoin_balance - JOKER_STATFLOUZZ_COST + reward;
    });

    // Outside the transaction — a friendship is reciprocal and the friend
    // list could be large. Same trade as `onAnswerCreated`.
    await fanOutFriendAnswerBadge(userRef, monthKey, monthDayKey, today);

    logger.info('Joker spent', {
      date: today,
      question_id: questionId,
      statcoins: JOKER_STATFLOUZZ_COST,
      user_id: userId,
    });

    return { statcoin_balance: balance };
  },
);
