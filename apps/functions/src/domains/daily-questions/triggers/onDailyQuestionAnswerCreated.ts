import { logger } from 'firebase-functions/v2';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import {
  DAILY_QUESTION_ANSWER_COLLECTION,
  QUESTION_COLLECTION,
  dailyQuestionAnswerConverter,
} from '@statowrel/models';

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
 * The trigger itself only decodes the event and hands it to its step; the work
 * lives there, so it stays callable from anywhere the projection has to be
 * replayed.
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
});
