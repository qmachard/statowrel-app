import {
  type Identifiable,
  QUESTION_COLLECTION,
  type QuestionData,
  questionConverter,
} from '@statowrel/models';

import { getCollectionRef } from '@/libs/firebase-admin';

/**
 * Every question waiting for a moderator, oldest first.
 *
 * The whole `pending` pot is read and sorted in memory rather than through an
 * `orderBy('created_at')`. An equality paired with an order on another field
 * needs a composite index, and this is not a query worth one: it runs once a
 * morning, and the pot is human-moderated content a few hundred documents deep
 * at most — the same reasoning `drawApprovedQuestion` makes about the approved
 * pot next to it. Revisit this if the pot ever grows past a few thousand.
 *
 * Oldest first because that is what a moderator should look at first: a
 * proposal nobody has answered is somebody waiting on their StatFlouzz.
 */
export const listPendingQuestions = async (): Promise<Identifiable<QuestionData>[]> => {
  const snapshot = await getCollectionRef(QUESTION_COLLECTION, questionConverter)
    .where('status', '==', 'pending')
    .get();

  return snapshot.docs
    .map((document) => ({ id: document.id, ...document.data() }))
    .sort((left, right) => left.created_at.localeCompare(right.created_at));
};
