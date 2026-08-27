import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import {
  type ProposeQuestionResult,
  QUESTION_COLLECTION,
  QUESTION_LABEL_MAX_LENGTH,
  QUESTION_MAX_OPTIONS,
  QUESTION_MIN_OPTIONS,
  QUESTION_OPTION_LABEL_MAX_LENGTH,
  QUESTION_OPTION_STAT_LABEL_MAX_LENGTH,
  QUESTION_STATCOIN_COST,
  type QuestionData,
  USER_COLLECTION,
  questionConverter,
  userConverter,
} from '@statowrel/models';
import { ulid } from 'ulid';
import { z } from 'zod';

import { REGION_CLOUD, createDocumentRef, getDocumentRef, runTransaction } from '@/libs/firebase-admin';

/**
 * The same shape the app's own form refuses (`apps/app/src/questions/schemas.ts`)
 * and the moderation console's (`apps/admin/src/questions/schemas.ts`), off the
 * one set of bounds all three read from `@statowrel/models`.
 *
 * It is not a duplicate of either: those two spare somebody a round trip, this
 * one is the check. A client is untrusted input, callable or not — hence
 * `.safeParse()` and never `.parse()`.
 */
const payloadSchema = z.object({
  label: z.string().trim().min(1).max(QUESTION_LABEL_MAX_LENGTH),
  options: z
    .array(z.object({
      label: z.string().trim().min(1).max(QUESTION_OPTION_LABEL_MAX_LENGTH),
      stat_label: z.string().trim().min(1).max(QUESTION_OPTION_STAT_LABEL_MAX_LENGTH),
    }))
    .min(QUESTION_MIN_OPTIONS)
    .max(QUESTION_MAX_OPTIONS),
});

/**
 * Proposing a question, paid for in StatCoins — docs/prd.md §4.7, the spending
 * half of the currency the answer trigger credits.
 *
 * **A callable, and now the only way a question can be written.** The rules let
 * an author create their own `pending` question until this shipped, which was
 * fine while proposing was free: a price nothing collects is not a price, and
 * the debit and the write have to be one operation or neither is worth
 * anything. So `v1_questions` is `allow create: if false` for every client and
 * this function is the door — one transaction holding the profile it debits and
 * the question it writes, so a question cannot exist unpaid for and a wallet
 * cannot be emptied without a question coming out of it.
 *
 * What it refuses, and with which code, because the app translates them one by
 * one (`apps/app/src/questions/errors.ts`):
 *
 * - `unauthenticated` — no session. A proposal is credited to somebody.
 * - `invalid-argument` — a question or an option the shape above rejects.
 * - `not-found` — a signed-in account with no profile document, which is an
 *   account that has not been through the username sheet yet: there is no
 *   handle to credit the question to and no wallet to debit.
 * - `failed-precondition` — the wallet is short of `QUESTION_STATCOIN_COST`.
 *   Its own code, because it is the one refusal the user can do something
 *   about: answer ten more days.
 *
 * The ULIDs — the question's and one per option — are minted here rather than
 * taken from the payload: an option's id is what a recorded answer and
 * `answer_counts` point at (`v1_question.ts`), so it is not a thing a client
 * gets to choose.
 *
 * Everything a *drawn* question carries stays null, the same way the console's
 * own create leaves it: `broadcast_at`, `broadcast_on` and `closes_at` belong
 * to the daily scheduler, `answer_counts` to the answer trigger, and
 * `rejection_reason` to a moderator who has not looked at this yet.
 */
export const proposeQuestion = onCall<unknown, Promise<ProposeQuestionResult>>(
  { region: REGION_CLOUD },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in to propose a question.');
    }

    const payload = payloadSchema.safeParse(request.data);

    if (!payload.success) {
      throw new HttpsError('invalid-argument', 'That is not a valid question.');
    }

    const userId = request.auth.uid;
    const userRef = getDocumentRef(USER_COLLECTION, userId, userConverter);
    // Minted outside the transaction on purpose: a transaction can be retried
    // on contention, and a ref built inside it would hand a retry a different
    // document id — the first attempt's write is rolled back, but the id would
    // still have moved under the result being returned.
    const questionRef = createDocumentRef(QUESTION_COLLECTION, questionConverter);

    const balance = await runTransaction(async (transaction) => {
      // Read before write, and the profile is the only read: the question is a
      // document that does not exist yet.
      const user = (await transaction.get(userRef)).data();

      if (user === undefined) {
        throw new HttpsError('not-found', 'No profile for this account.');
      }

      if (user.statcoin_balance < QUESTION_STATCOIN_COST) {
        throw new HttpsError('failed-precondition', 'Not enough StatCoins to propose a question.');
      }

      const question: QuestionData = {
        label: payload.data.label,
        options: payload.data.options.map((option) => ({
          id: ulid(),
          label: option.label,
          stat_label: option.stat_label,
        })),
        status: 'pending',
        author_id: userId,
        // Read off the very profile being debited, so the credit line of
        // docs/prd.md §5.4 costs no second read and cannot name anybody else.
        author_username: user.username,
        rejection_reason: null,
        statcoin_cost: QUESTION_STATCOIN_COST,
        refunded_at: null,
        broadcast_at: null,
        broadcast_on: null,
        closes_at: null,
        answer_counts: {},
        created_at: new Date().toISOString(),
        // Never modified: `updated_at` is what a moderator's edit stamps, and
        // the console falls back to `created_at` while there is none.
        updated_at: null,
      };

      transaction.set(questionRef, question);

      // `increment` rather than the balance read a line above: the answer
      // trigger credits the same three fields from its own transaction, and a
      // computed total would carry back a value taken before it. update() does
      // not run the converter (see the repo's CLAUDE.md), so this is a
      // Timestamp and not an ISO string.
      transaction.update(userRef, {
        statcoin_balance: FieldValue.increment(-QUESTION_STATCOIN_COST),
        statcoins_spent: FieldValue.increment(QUESTION_STATCOIN_COST),
        updated_at: Timestamp.now(),
      });

      return user.statcoin_balance - QUESTION_STATCOIN_COST;
    });

    logger.info('Question proposed', {
      question_id: questionRef.id,
      statcoins: QUESTION_STATCOIN_COST,
      user_id: userId,
    });

    return { question_id: questionRef.id, statcoin_balance: balance };
  },
);
