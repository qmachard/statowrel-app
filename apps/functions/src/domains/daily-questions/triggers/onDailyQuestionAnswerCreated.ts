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

  await onAnswerCreated(parseSnapshotData(event.data, dailyQuestionAnswerConverter));
});
