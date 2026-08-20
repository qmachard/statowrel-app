import { onSnapshot, orderBy, query } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import {
  type Identifiable,
  QUESTION_COLLECTION,
  type QuestionData,
  questionConverter,
} from '@statowrel/models';

import { getCollectionRef } from '@/lib/firestore';

export type ModeratedQuestion = Identifiable<QuestionData>;

export interface QuestionsState {
  questions: ModeratedQuestion[];
  loading: boolean;
  error: string | null;
}

/**
 * The whole moderation pot, newest first.
 *
 * Unfiltered, unlike an author's own list: this interface is admin-only, and the
 * wildcard `isAdmin()` rule is what opens the pot up. Subscribed rather than
 * read once, so a verdict lands in the table without a reload — including one
 * cast from the FireCMS backoffice at the same moment.
 */
export const useQuestions = (): QuestionsState => {
  const [ state, setState ] = useState<QuestionsState>({ questions: [], loading: true, error: null });

  useEffect(() => onSnapshot(
    query(getCollectionRef(QUESTION_COLLECTION, questionConverter), orderBy('created_at', 'desc')),
    (snapshot) => {
      setState({
        questions: snapshot.docs.map((document) => ({ ...document.data(), id: document.id })),
        loading: false,
        error: null,
      });
    },
    (error) => {
      console.warn('[questions] lost the moderation subscription', error);
      setState({ questions: [], loading: false, error: 'Impossible de charger les questions. Réessaie plus tard.' });
    },
  ), []);

  return state;
};
