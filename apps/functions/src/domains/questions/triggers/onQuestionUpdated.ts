import { logger } from 'firebase-functions/v2';
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { QUESTION_COLLECTION, questionConverter } from '@statowrel/models';

import { REGION_CLOUD, parseSnapshotData } from '@/libs/firebase-admin';

import { onQuestionRejected } from './steps/onQuestionRejected';

/**
 * Fires on every write to a question that already existed — docs/prd.md §4.7.
 *
 * `onDocumentUpdated` rather than `onDocumentWritten`: a question is created
 * `pending` (or seeded, or `demo`), never rejected, so a creation has nothing
 * here to do.
 *
 * **It is a busy trigger, and the step it dispatches to is what makes that
 * cheap.** Every answer given in the app increments `answer_counts` on its
 * question, which is an update, and Firestore triggers cannot be filtered on a
 * field — so this runs on the hottest write path there is. `onQuestionRejected`
 * returns on the status before it reads anything, so the common case costs one
 * invocation and no Firestore read.
 */
export const onQuestionUpdated = onDocumentUpdated({
  region: REGION_CLOUD,
  document: `${QUESTION_COLLECTION}/{question_id}`,
}, async (event) => {
  if (event.data === undefined) {
    logger.error('Question updated event without a document', { params: event.params });

    return;
  }

  await onQuestionRejected(event.data.after.id, parseSnapshotData(event.data.after, questionConverter));
});
