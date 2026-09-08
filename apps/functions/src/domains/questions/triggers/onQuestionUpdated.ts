import { logger } from 'firebase-functions/v2';
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { QUESTION_COLLECTION, questionConverter } from '@statowrel/models';

import { REGION_CLOUD, parseSnapshotData } from '@/libs/firebase-admin';

import { onQuestionModerated } from './steps/onQuestionModerated';
import { onQuestionRejected } from './steps/onQuestionRejected';

/**
 * Fires on every write to a question that already existed — docs/prd.md §4.7.
 *
 * `onDocumentUpdated` rather than `onDocumentWritten`: a question is created
 * `pending` (or seeded, or `demo`), never rejected, so a creation has nothing
 * here to do.
 *
 * **It is a busy trigger, and the steps it dispatches to are what make that
 * cheap.** Every answer given in the app increments `answer_counts` on its
 * question, which is an update, and Firestore triggers cannot be filtered on a
 * field — so this runs on the hottest write path there is. Both steps return on
 * the status before they read anything, so the common case costs one invocation
 * and no Firestore read.
 *
 * Two steps and one trigger, deliberately: the money and the news are separate
 * decisions on separate markers — a refund is final, a verdict is not — and the
 * doctrine of docs/prd.md §4.9 is that nothing earns a second Eventarc trigger
 * on a path one already watches. They run one after the other rather than in
 * parallel: the rejection notification says the refund in so many words, so the
 * money moves first.
 */
export const onQuestionUpdated = onDocumentUpdated({
  region: REGION_CLOUD,
  document: `${QUESTION_COLLECTION}/{question_id}`,
}, async (event) => {
  if (event.data === undefined) {
    logger.error('Question updated event without a document', { params: event.params });

    return;
  }

  const questionId = event.data.after.id;
  const question = parseSnapshotData(event.data.after, questionConverter);

  await onQuestionRejected(questionId, question);
  await onQuestionModerated(questionId, question);
});
