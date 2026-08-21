import { getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import {
  DEMO_QUESTION_ID,
  QUESTION_COLLECTION,
  type QuestionData,
  questionConverter,
} from '@statowrel/models';

import { getDocumentRef } from '@/lib/firestore';

export interface DemoQuestionView {
  /** `null` while it loads, and for good when there is none to pose. */
  question: QuestionData | null;
}

/**
 * The sample question the carousel poses — `v1_questions/{DEMO_QUESTION_ID}`,
 * read once by its fixed id.
 *
 * The only read in the app that runs **without a session**: `firestore.rules`
 * opens a `demo` question to an anonymous `get`, because the carousel comes
 * before sign-up. It is also read and never subscribed to — nobody answers a
 * demo, so its `answer_counts` do not move under the screen the way a broadcast
 * question's do.
 *
 * Anything that goes wrong — no document, rules, network — is simply « no demo
 * to offer »: the carousel then ends on its sign-up call to action instead. It
 * is a sample, never a step somebody can be stuck on.
 */
export const useDemoQuestion = (): DemoQuestionView => {
  const [ question, setQuestion ] = useState<QuestionData | null>(null);

  useEffect(() => {
    let cancelled = false;

    getDoc(getDocumentRef(QUESTION_COLLECTION, DEMO_QUESTION_ID, questionConverter))
      .then((snapshot) => {
        const data = snapshot.data() ?? null;

        if (!cancelled) {
          // An empty question would render as a sheet with no options to tap.
          setQuestion(data !== null && data.options.length > 0 ? data : null);
        }
      })
      .catch((error: unknown) => {
        console.warn('[onboarding] could not load the demo question', error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { question };
};
