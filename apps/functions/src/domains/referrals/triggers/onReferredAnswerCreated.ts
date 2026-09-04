import { logger } from 'firebase-functions/v2';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import {
  DAILY_QUESTION_ANSWER_COLLECTION,
  DEMO_QUESTION_ID,
  QUESTION_COLLECTION,
} from '@statowrel/models';

import { REGION_CLOUD } from '@/libs/firebase-admin';

import { payReferralReward } from './steps/payReferralReward';

/**
 * Settles a referral on the newcomer's first real answer — docs/prd.md §4.9.
 *
 * **A second trigger on the answers path, rather than a branch inside
 * `daily-questions`' own.** That one runs the day's whole projection — the
 * tally, the calendar month, the streak and the milestone payout, the friends'
 * badges — in one transaction on the account's hot path. Hanging a *second*
 * account's wallet off it would widen that transaction for something that
 * concerns almost nobody: a referral settles once per account, ever. Here it
 * costs one profile read on an answer, and returns.
 *
 * **The demo question is dropped on its id, before anything is read.** The
 * onboarding carousel's pick is flushed to the same path the first moment a
 * session exists (`useDemoAnswerFlush`), so for a referred account it is
 * usually the first answer document there is — a trigger that let it through
 * would pay at sign-up while believing it paid at engagement, which is the one
 * thing this whole design exists to avoid.
 */
export const onReferredAnswerCreated = onDocumentCreated({
  region: REGION_CLOUD,
  document: `${QUESTION_COLLECTION}/{question_id}/${DAILY_QUESTION_ANSWER_COLLECTION}/{user_id}`,
}, async (event) => {
  if (event.data === undefined) {
    logger.error('Answer created event without a document', { params: event.params });

    return;
  }

  if (event.params.question_id === DEMO_QUESTION_ID) {
    return;
  }

  // The document id is the author's Firebase Auth UID, so the answer itself
  // never has to be decoded here — whose answer it is, is the whole payload.
  await payReferralReward(event.params.user_id);
});
