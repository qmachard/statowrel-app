import { FieldValue, Timestamp, type UpdateData } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import {
  QUESTION_COLLECTION,
  type QuestionData,
  USER_COLLECTION,
  type UserFirebaseData,
  questionConverter,
  userConverter,
} from '@statowrel/models';

import { getDocumentRef, runTransaction } from '@/libs/firebase-admin';

/**
 * Hands a rejected question's StatFlouzz back to whoever paid for them —
 * docs/prd.md §4.7, the other end of `questions-proposeQuestion`.
 *
 * **Why a refund at all.** The price buys a question a place in the pot, not a
 * verdict. A rejection is the moderation saying this one will never run, and
 * charging for it would make the moderator's call cost the author ten days of
 * streak — the currency would stop being what a proposal costs and become what
 * a *risk* costs. Approving and drawing are what the money pays for; nothing
 * else takes it.
 *
 * **Only what was actually paid comes back.** `statcoin_cost` is stamped by the
 * callable and null everywhere else, so the seeded catalogue, the onboarding
 * demo and anything a moderator writes from the console refund nothing: they
 * cost nothing. That is why the amount is read off the question rather than
 * assumed to be `QUESTION_STATFLOUZZ_COST` — the day the price moves, an old
 * question still hands back what it took.
 *
 * **The marker is the whole design.** A Firestore trigger is delivered at least
 * once, and this one also fires again on every later edit of a question already
 * sitting at `rejected` — rewriting the reason, approving it back. Crediting a
 * wallet twice is counterfeiting, so `refunded_at` is read inside the very
 * transaction that credits: the stamp cannot exist without the credit, and the
 * credit cannot run against a stamp that already does. It is checked once
 * outside too, on the snapshot the event carries, so the ordinary redelivery
 * costs no transaction at all.
 *
 * A refund is final: a question approved after being refunded goes back into
 * the pot without its author being charged again. That is a moderator putting a
 * question back, not a second purchase, and re-debiting a wallet nobody touched
 * would be a bill for somebody else's change of mind.
 */
export const onQuestionRejected = async (questionId: string, question: QuestionData): Promise<void> => {
  const cost = question.statcoin_cost ?? 0;

  if (question.status !== 'rejected' || cost <= 0 || question.refunded_at !== null) {
    return;
  }

  const questionRef = getDocumentRef(QUESTION_COLLECTION, questionId, questionConverter);
  const userRef = getDocumentRef(USER_COLLECTION, question.author_id, userConverter);

  await runTransaction(async (transaction) => {
    // Read again inside the transaction, and not for the marker alone: the
    // event snapshot is a moment in the past, and the status may have moved
    // back since.
    const current = (await transaction.get(questionRef)).data();
    const author = (await transaction.get(userRef)).data();

    if (current === undefined || current.status !== 'rejected' || current.refunded_at !== null) {
      logger.info('Question already refunded or no longer rejected, nothing to do', { question_id: questionId });

      return;
    }

    const refund = current.statcoin_cost ?? 0;

    if (refund <= 0) {
      return;
    }

    // update() does not run the converter (see the repo's CLAUDE.md), so both
    // of these are Timestamps and not ISO strings.
    transaction.update(questionRef, { refunded_at: Timestamp.now() });

    if (author === undefined) {
      // A deleted account (`users-deleteAccount` drops the profile and leaves
      // the questions standing). The money has nowhere to go, and the question
      // is stamped all the same: without it, every later edit of this rejection
      // would run this transaction again for nothing.
      logger.error('Rejected question of an account with no profile, nothing to refund', {
        question_id: questionId,
        user_id: question.author_id,
      });

      return;
    }

    // The debit's mirror image: `statcoins_spent` comes back down rather than
    // `statcoins_earned` going up, because nothing was earned here — this
    // undoes a purchase, and the lifetime trace has to say what was really
    // spent. `increment` for the usual reason: the answer trigger credits the
    // same fields from its own transaction.
    const wallet: UpdateData<UserFirebaseData> = {
      statcoin_balance: FieldValue.increment(refund),
      statcoins_spent: FieldValue.increment(-refund),
      updated_at: Timestamp.now(),
    };

    transaction.update(userRef, wallet);

    logger.info('Rejected question refunded', {
      question_id: questionId,
      statflouzz: refund,
      user_id: question.author_id,
    });
  });
};
