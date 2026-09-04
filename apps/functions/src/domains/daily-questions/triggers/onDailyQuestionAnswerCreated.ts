import { logger } from 'firebase-functions/v2';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import {
  DAILY_QUESTION_ANSWER_COLLECTION,
  DEMO_QUESTION_ID,
  QUESTION_COLLECTION,
  dailyQuestionAnswerConverter,
} from '@statowrel/models';

import { payReferralReward } from '@/domains/referrals';
import { parseSnapshotData, REGION_CLOUD } from '@/libs/firebase-admin';

import { onAnswerCreated } from './steps/onAnswerCreated';

/**
 * How long to sit on an answer before counting it — **on the emulator, and
 * only there**.
 *
 * The beat between an answer being written and its tally moving is a real part
 * of the product: the day screen reads the tally once, at the door, and folds
 * its own answer in until `counted_at` says the trigger has (see
 * `useDailyQuestion`). In production that beat is a Cloud Function's dispatch
 * and, on the first answer of a morning, its cold start. On the emulator it is
 * a few milliseconds — the runtime is already up, in the same process tree as
 * the write — so the local build always lands on the *other* branch, and the
 * one that matters cannot be looked at.
 *
 * `ANSWER_TRIGGER_DELAY_MS` buys it back. Set it in `apps/functions/.env.local`,
 * which Firebase loads for the emulator alone (docs/architecture.md
 * § Environments), and the trigger waits that long before doing anything:
 *
 *     ANSWER_TRIGGER_DELAY_MS=3000
 *
 * The `FUNCTIONS_EMULATOR` check is the second lock, and it is the one that
 * matters: a deployed function never sets it, so a value that found its way
 * into a real deploy still delays nothing.
 */
const ANSWER_TRIGGER_DELAY_MS = Number(process.env.ANSWER_TRIGGER_DELAY_MS ?? '0');

const holdBack = async (): Promise<void> => {
  if (process.env.FUNCTIONS_EMULATOR !== 'true' || !(ANSWER_TRIGGER_DELAY_MS > 0)) {
    return;
  }

  logger.info('Holding the answer trigger back, emulator only', { delay_ms: ANSWER_TRIGGER_DELAY_MS });

  await new Promise((resolve) => {
    setTimeout(resolve, ANSWER_TRIGGER_DELAY_MS);
  });
};

/**
 * Fires on every answer written under a question — docs/prd.md §6.
 *
 * An answer is created and never updated nor deleted (docs/prd.md §4.2), so
 * `onDocumentCreated` covers the whole lifecycle: there is no later edit to
 * mirror, and nothing to undo.
 *
 * The trigger itself only decodes the event and hands it to its steps; the work
 * lives there, so it stays callable from anywhere the projection has to be
 * replayed.
 *
 * **Two steps, and the second one belongs to another domain.** An answer is
 * also what settles a referral (docs/prd.md §4.9), and giving that its own
 * `onDocumentCreated` on this same path would have meant a second Eventarc
 * trigger, a second function and a second invocation on *every* answer given in
 * the app — to settle something that happens once per account, ever. So
 * `referrals` registers nothing and exports its step, which this trigger calls.
 * The steps keep their own transactions: the referral does not widen the one
 * that moves the streak.
 */
export const onDailyQuestionAnswerCreated = onDocumentCreated({
  region: REGION_CLOUD,
  document: `${QUESTION_COLLECTION}/{question_id}/${DAILY_QUESTION_ANSWER_COLLECTION}/{user_id}`,
}, async (event) => {
  if (event.data === undefined) {
    logger.error('Answer created event without a document', { params: event.params });

    return;
  }

  await holdBack();

  await onAnswerCreated(parseSnapshotData(event.data, dailyQuestionAnswerConverter));

  // The onboarding carousel's pick lands on this very path the first moment a
  // session exists (`useDemoAnswerFlush`), so for a referred account it is
  // usually the first answer document there is — settling on it would pay at
  // sign-up while believing it paid at engagement, which is the one thing
  // §4.9's design exists to avoid. `onAnswerCreated` above still runs on it:
  // a demo counts in the question's tally, just in nothing else.
  if (event.params.question_id === DEMO_QUESTION_ID) {
    return;
  }

  try {
    // The document id is the author's UID, so whose answer it is, is the whole
    // payload the referral needs.
    await payReferralReward(event.params.user_id);
  } catch (error) {
    // Swallowed rather than thrown, and that is not resignation: this trigger
    // is not configured to retry, so a throw would only lose the answer
    // projection's own success from the log. The retry is the *next* answer —
    // `referral_rewarded_at` is still null, so the payout settles then.
    logger.error('Referral payout failed, will settle on a later answer', {
      user_id: event.params.user_id,
      error,
    });
  }
});
