import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import {
  DAILY_QUESTION_ANSWER_COLLECTION,
  dailyQuestionAnswerConverter,
  dailyQuestionDateKey,
  JOKER_STATFLOUZZ_COST,
  QUESTION_COLLECTION,
  questionConverter,
  USER_COLLECTION,
  userConverter,
  type UseJokerResult,
} from '@statowrel/models';
import { z } from 'zod';

import { REGION_CLOUD, getDocumentRef, getSubDocumentRef, runTransaction } from '@/libs/firebase-admin';

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
 * the debit and the answer creation must be one operation, otherwise a
 * wallet could be emptied without the day being marked or a day could be
 * marked without paying.
 *
 * **A joker is stored as an answer** (`v1_daily_question_answers`) with
 * `is_joker: true` and an empty `option_id`. That means the whole projection
 * — calendar `jokers.{DD}`, streak advance, milestone payout, friend badge
 * fan-out — belongs to `onAnswerCreated`, which branches on `is_joker`. This
 * callable's only job is to debit the wallet atomically with the answer
 * document that fires that trigger.
 *
 * What it refuses, and with which code — the app translates them one by one
 * (`apps/app/src/daily-question/data/jokerErrors.ts`):
 *
 * - `unauthenticated` — no session.
 * - `invalid-argument` — a payload the shape above rejects.
 * - `not-found` — no profile document, no question document.
 * - `failed-precondition` — the question is not today's, the wallet is
 *   short of `JOKER_STATFLOUZZ_COST`, or the user has already answered
 *   today (answer or joker, both live in the same document).
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

    const userRef = getDocumentRef(USER_COLLECTION, userId, userConverter);
    const questionRef = getDocumentRef(QUESTION_COLLECTION, questionId, questionConverter);
    const answerRef = getSubDocumentRef(questionRef, DAILY_QUESTION_ANSWER_COLLECTION, userId, dailyQuestionAnswerConverter);

    const balance = await runTransaction(async (transaction) => {
      const [ userSnap, questionSnap, answerSnap ] = await Promise.all([
        transaction.get(userRef),
        transaction.get(questionRef),
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

      // One document per person per question: an answer and a joker cannot
      // coexist for a given day, since they share the same document id.
      if (answerSnap.exists) {
        const existing = answerSnap.data();

        throw new HttpsError('failed-precondition',
          existing?.is_joker ? 'You have already used a joker today.' : 'You have already answered today.');
      }

      if (user.statcoin_balance < JOKER_STATFLOUZZ_COST) {
        throw new HttpsError('failed-precondition', 'Not enough StatFlouzz for a joker.');
      }

      const now = Timestamp.now();

      // The joker rides as an answer with `is_joker: true`; `onAnswerCreated`
      // handles calendar, streak, milestone payout and friend fan-out from
      // there, exactly like a regular answer would.
      transaction.set(answerRef, {
        user_id: userId,
        question_id: questionId,
        date: today,
        option_id: '',
        is_joker: true,
        answered_at: now.toDate().toISOString(),
        late: false,
        counted_at: null,
      });

      // Wallet debit in the same transaction — the two must land together or
      // the day was passed for free.
      transaction.update(userRef, {
        statcoin_balance: FieldValue.increment(-JOKER_STATFLOUZZ_COST),
        statcoins_spent: FieldValue.increment(JOKER_STATFLOUZZ_COST),
        updated_at: now,
      });

      return user.statcoin_balance - JOKER_STATFLOUZZ_COST;
    });

    logger.info('Joker spent', {
      date: today,
      question_id: questionId,
      statcoins: JOKER_STATFLOUZZ_COST,
      user_id: userId,
    });

    return { statcoin_balance: balance };
  },
);
