import { Timestamp } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import {
  MY_QUESTION_CHANNEL_ID,
  QUESTION_COLLECTION,
  type QuestionData,
  type QuestionFirebaseData,
  isPlayerProposal,
  questionConverter,
} from '@statowrel/models';

import { type PushNotification, sendPushToUser } from '@/domains/notifications';
import { getDocumentRef, runTransaction } from '@/libs/firebase-admin';

/**
 * The two verdicts, and the marker each of them is allowed exactly once.
 *
 * Two markers rather than one, because the two do not cover the same set: a
 * question rejected, then put back in the pot, then rejected again is two
 * verdicts its author has every reason to hear, and a single
 * « déjà prévenu » field would swallow the second.
 */
const MARKERS = {
  approved: 'approval_notified_at',
  rejected: 'rejection_notified_at',
} as const satisfies Record<string, keyof QuestionFirebaseData>;

type ModeratedStatus = keyof typeof MARKERS;

const isModerated = (status: QuestionData['status']): status is ModeratedStatus => status in MARKERS;

/**
 * What each verdict says — docs/prd.md §4.7.
 *
 * The approval names the question rather than congratulating in the abstract:
 * a player who has proposed three of them has to know which one just got
 * through. The rejection carries its reason, which is the whole point of asking
 * a moderator to type one, and, when there was one, the refund in the same
 * breath: the money moved in silence until now, and « tes 100§ t'ont été
 * rendus » is the sentence that keeps a refusal from reading as a confiscation.
 */
const verdictFor = (question: QuestionData): PushNotification => {
  if (question.status === 'approved') {
    return {
      title: 'Ta question est validée',
      body: `« ${question.label} » rejoint le pot. Elle peut tomber n'importe quel matin.`,
      channelId: MY_QUESTION_CHANNEL_ID,
      data: { type: 'my_questions' },
    };
  }

  const reason = question.rejection_reason ?? '';
  // Read off the question rather than assumed from the current price, and off
  // `refunded_at` rather than off the status: the refund step runs first, in
  // this same invocation, and a second rejection of a question already refunded
  // hands nothing back. Saying « on t'a rendu tes 100§ » there would promise a
  // credit the wallet never shows. Same sentence as the app's own row
  // (`apps/app/src/questions/copy.ts`), so the banner and the list agree.
  const refund = question.refunded_at === null ? null : question.statcoin_cost;
  const refundLine = refund === null ? '' : ` Tes ${refund}§ t'ont été rendus.`;

  return {
    title: 'Ta question n’a pas été retenue',
    // No reason typed is possible — the console asks for one, a fixture or an
    // older rejection may carry none — and « ... : "" » on a lock screen reads
    // as a bug.
    body: reason.length > 0
      ? `« ${question.label} » : ${reason}${refundLine}`
      : `« ${question.label} » n'a pas été retenue.${refundLine}`,
    channelId: MY_QUESTION_CHANNEL_ID,
    data: { type: 'my_questions' },
  };
};

/**
 * Tells an author what the moderation decided — docs/prd.md §4.7, the first two
 * of the three moments a paid proposal is worth hearing about (the third, the
 * day it is drawn and the tally it left, rides the 07:00 fan-out instead).
 *
 * **It adds no Cloud Function.** `questions-onQuestionUpdated` already fires on
 * every write to a question, so this is a second step under the trigger the
 * refund already uses, on that step's exact model — the same doctrine
 * docs/prd.md §4.9 states for the referral payout, which reuses the answer
 * trigger rather than adding one of its own.
 *
 * **The common case has to cost nothing.** That trigger runs on the hottest
 * write path in the app: every answer given increments `answer_counts`, and a
 * Firestore trigger cannot be filtered on a field. So this returns on the
 * status — `used`, `pending`, `demo` — before it reads anything at all, and a
 * day's worth of answers costs one branch each.
 *
 * **Only a real proposal has an author to notify.** `isPlayerProposal` decides,
 * on `statcoin_cost`: the seeded catalogue, the onboarding demo and anything a
 * moderator writes from the console are credited to somebody who never wrote
 * them, and telling that person their question was approved is telling them
 * about a stranger's.
 *
 * **The marker is claimed, not stamped afterwards.** A trigger is delivered at
 * least once, this one fires again on every later edit of a question already
 * sitting at its verdict, and — the trap of the whole design — writing the
 * marker is *itself* an update, so it fires the trigger on its own write. The
 * claim therefore happens inside a transaction that re-reads the status and the
 * marker, and the push only goes out once that claim landed. A push that fails
 * after it is a banner lost and nothing else: the verdict is in Firestore, and
 * the author's « Mes questions » list is a live snapshot of it (docs/prd.md
 * §5.3).
 */
export const onQuestionModerated = async (questionId: string, question: QuestionData): Promise<void> => {
  if (!isModerated(question.status) || !isPlayerProposal(question)) {
    return;
  }

  const marker = MARKERS[question.status];

  if (question[marker] !== null) {
    return;
  }

  const questionRef = getDocumentRef(QUESTION_COLLECTION, questionId, questionConverter);

  const claimed = await runTransaction(async (transaction) => {
    // Read again inside the transaction, and not for the marker alone: the
    // event snapshot is a moment in the past, and the moderation may have
    // changed its mind since.
    const current = (await transaction.get(questionRef)).data();

    if (current === undefined || current.status !== question.status || current[marker] !== null) {
      return null;
    }

    // update() does not run the converter (see the repo's CLAUDE.md), so this
    // is a Timestamp and not an ISO string. Written out rather than keyed by
    // `marker`, which would be a computed key `UpdateData` cannot type.
    transaction.update(questionRef, marker === 'approval_notified_at'
      ? { approval_notified_at: Timestamp.now() }
      : { rejection_notified_at: Timestamp.now() });

    return current;
  });

  if (claimed === null) {
    logger.info('Question verdict already notified, nothing to do', { question_id: questionId, status: question.status });

    return;
  }

  const report = await sendPushToUser(claimed.author_id, verdictFor(claimed));

  logger.info('Question author notified of the moderation verdict', {
    question_id: questionId,
    status: claimed.status,
    user_id: claimed.author_id,
    ...report,
  });
};
