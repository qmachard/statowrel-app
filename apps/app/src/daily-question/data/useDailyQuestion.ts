import { getDoc } from 'firebase/firestore';
import { useEffect, useState, useSyncExternalStore } from 'react';

import {
  DAILY_QUESTION_ANSWER_COLLECTION,
  DAILY_QUESTION_COLLECTION,
  type DailyQuestionAnswerData,
  type DailyQuestionData,
  QUESTION_COLLECTION,
  type QuestionData,
  USER_COLLECTION,
  dailyQuestionAnswerConverter,
  dailyQuestionConverter,
  questionConverter,
  userConverter,
} from '@statowrel/models';

import { useAuth } from '@/auth/AuthContext';
import { readAnswer, subscribeToAnswers } from '@/daily-question/data/answerStore';
import { getDocumentRef, getSubDocumentRef } from '@/lib/firestore';

/**
 * What a day can look like to the app — the four dead ends are as much part of
 * the screen as the question itself (docs/prd.md §5.2, §5.4):
 *
 * - `missing` — no question was ever drawn for that day (before launch, or a
 *   publication incident). The calendar already renders such a day as inert.
 * - `unpublished` — the day document exists but its 07:00 drop time hasn't
 *   come. The scheduler draws and publishes in the same run, so this only shows
 *   up on a clock a few seconds ahead of the server's — the model still allows
 *   a `published_at` in the future, and reading the question then would be
 *   denied by `firestore.rules` anyway.
 */
export type DailyQuestionStatus = 'loading' | 'ready' | 'unpublished' | 'missing' | 'error';

export interface DailyQuestionView {
  status: DailyQuestionStatus;
  dailyQuestion: DailyQuestionData | null;
  question: QuestionData | null;
  /** The current user's answer, or `null` while the day is still theirs to answer. */
  answer: DailyQuestionAnswerData | null;
  /** Pseudo of whoever proposed the question — the credit of docs/prd.md §5.4. */
  authorName: string | null;
}

const EMPTY: DailyQuestionView = {
  status: 'loading',
  dailyQuestion: null,
  question: null,
  answer: null,
  authorName: null,
};

/**
 * The author's username, or `null` — a missing profile is not worth failing the
 * screen over, the credit line simply doesn't render.
 */
const readAuthorName = async (authorId: string): Promise<string | null> => {
  if (authorId === '') {
    return null;
  }

  try {
    const snapshot = await getDoc(getDocumentRef(USER_COLLECTION, authorId, userConverter));

    return snapshot.data()?.username ?? null;
  } catch {
    return null;
  }
};

/**
 * Everything one day's question screen needs, read from Firestore.
 *
 * Three documents, because the model deliberately doesn't denormalize the
 * question into the day (docs/architecture.md): the day
 * (`v1_daily_questions/{date}`), the question it points at, and the current
 * user's answer — whose document id *is* their UID, so "already answered" is a
 * single `get()` rather than a query.
 *
 * The question is only read once the day has dropped, matching the
 * `broadcast_at` gate `firestore.rules` puts on `v1_questions`.
 *
 * The answer has a second source: `answerStore`, which holds what this session
 * has just written and is what makes every screen showing the day flip to its
 * answered state at once.
 */
export const useDailyQuestion = (date: string): DailyQuestionView => {
  const { user } = useAuth();
  const userId = user?.uid ?? null;
  const [ view, setView ] = useState<DailyQuestionView>(EMPTY);

  // An answer given during this session wins over the one the read found —
  // which is `null` whenever the read happened before the answer was written.
  const written = useSyncExternalStore(subscribeToAnswers, () => readAnswer(userId, date));

  useEffect(() => {
    let cancelled = false;

    const publish = (next: DailyQuestionView) => {
      if (!cancelled) {
        setView(next);
      }
    };

    const load = async () => {
      publish(EMPTY);

      try {
        const daySnapshot = await getDoc(getDocumentRef(DAILY_QUESTION_COLLECTION, date, dailyQuestionConverter));
        const dailyQuestion = daySnapshot.data() ?? null;

        if (dailyQuestion === null) {
          publish({ ...EMPTY, status: 'missing' });

          return;
        }

        if (new Date(dailyQuestion.published_at) > new Date()) {
          publish({ ...EMPTY, status: 'unpublished', dailyQuestion });

          return;
        }

        const [ questionSnapshot, answerSnapshot ] = await Promise.all([
          getDoc(getDocumentRef(QUESTION_COLLECTION, dailyQuestion.question_id, questionConverter)),
          user === null
            ? null
            : getDoc(getSubDocumentRef(
              DAILY_QUESTION_COLLECTION,
              date,
              DAILY_QUESTION_ANSWER_COLLECTION,
              user.uid,
              dailyQuestionAnswerConverter,
            )),
        ]);

        const question = questionSnapshot.data() ?? null;

        if (question === null) {
          publish({ ...EMPTY, status: 'missing', dailyQuestion });

          return;
        }

        publish({
          status: 'ready',
          dailyQuestion,
          question,
          answer: answerSnapshot?.data() ?? null,
          authorName: await readAuthorName(question.author_id),
        });
      } catch (error) {
        console.warn('[daily-question] could not load the day', date, error);
        publish({ ...EMPTY, status: 'error' });
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [ date, user ]);

  return written === null ? view : { ...view, answer: written };
};
