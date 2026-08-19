import {
  type Identifiable,
  QUESTION_COLLECTION,
  type QuestionData,
  questionConverter,
} from '@statowrel/models';

import { getCollectionRef } from '@/libs/firebase-admin';

/**
 * Draws one approved question at random, or `null` when the pot is empty.
 *
 * The whole approved pot is read to pick uniformly from it. Firestore has no
 * random operator, and the usual workaround — a random document-id pivot — is
 * biased here: ids are ULIDs, so a random pivot favours whatever was created
 * most recently. The pot is human-moderated content, a few hundred documents at
 * most; revisit this if it ever grows past a few thousand.
 */
export const drawApprovedQuestion = async (): Promise<Identifiable<QuestionData> | null> => {
  const snapshot = await getCollectionRef(QUESTION_COLLECTION, questionConverter)
    .where('status', '==', 'approved')
    .get();

  if (snapshot.empty) {
    return null;
  }

  const document = snapshot.docs[Math.floor(Math.random() * snapshot.docs.length)];

  return { id: document.id, ...document.data() };
};
