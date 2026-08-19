import { getDoc, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';

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

/**
 * Each slice of state carries the key it describes — the day key, the question
 * id — so a slice belonging to the previous one is simply not current, rather
 * than something an effect has to reset on the way in. Which is also what keeps
 * a stale day from showing for one render after the route's `date` changes.
 */
interface DayState {
  date: string;
  dailyQuestion: DailyQuestionData | null;
  /** Whether the 07:00 drop time has come — decided in the subscription, where the clock is worth reading. */
  published: boolean;
  failed: boolean;
}

interface QuestionState {
  questionId: string;
  question: QuestionData | null;
  authorName: string | null;
  failed: boolean;
}

const statusOf = (day: DayState | null, question: QuestionState | null): DailyQuestionStatus => {
  if (day === null) {
    return 'loading';
  }

  if (day.failed) {
    return 'error';
  }

  if (day.dailyQuestion === null) {
    return 'missing';
  }

  if (!day.published) {
    return 'unpublished';
  }

  if (question === null) {
    return 'loading';
  }

  if (question.failed) {
    return 'error';
  }

  return question.question === null ? 'missing' : 'ready';
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
 * Everything one day's question screen needs, from Firestore.
 *
 * Three documents, because the model deliberately doesn't denormalize the
 * question into the day (docs/architecture.md): the day
 * (`v1_daily_questions/{date}`), the question it points at, and the current
 * user's answer — whose document id *is* their UID, so "already answered" is a
 * single document rather than a query.
 *
 * Two of the three are **subscribed to**, the third is read once:
 *
 * - **The day**, because `answer_counts` moves every time anybody answers, and
 *   the StatOwrel card's rarity is that map's shape at display time
 *   (docs/prd.md §5.5). It also makes the 07:00 drop land on a screen that is
 *   already open, instead of on the next time it is opened.
 * - **The answer**, because it is what flips the sheet to its answered state.
 *   Firestore hands a local write to its own listeners before the round trip,
 *   so the flip happens on the tap rather than on the server.
 * - **The question** is read once: `firestore.rules` lets nobody but a
 *   moderator write one, and a question that has been broadcast is settled —
 *   there is nothing to wait for.
 */
export const useDailyQuestion = (date: string): DailyQuestionView => {
  const { user } = useAuth();
  const userId = user?.uid ?? null;

  const [ dayState, setDayState ] = useState<DayState | null>(null);
  const [ questionState, setQuestionState ] = useState<QuestionState | null>(null);
  const [ answerState, setAnswerState ] = useState<{ key: string; answer: DailyQuestionAnswerData | null } | null>(null);

  useEffect(() => onSnapshot(
    getDocumentRef(DAILY_QUESTION_COLLECTION, date, dailyQuestionConverter),
    (snapshot) => {
      const dailyQuestion = snapshot.data() ?? null;

      setDayState({
        date,
        dailyQuestion,
        published: dailyQuestion !== null && new Date(dailyQuestion.published_at) <= new Date(),
        failed: false,
      });
    },
    (error) => {
      console.warn('[daily-question] lost the day subscription', date, error);
      setDayState({ date, dailyQuestion: null, published: false, failed: true });
    },
  ), [ date ]);

  const day = dayState?.date === date ? dayState : null;
  const questionId = day?.published === true ? day.dailyQuestion?.question_id ?? null : null;

  useEffect(() => {
    if (questionId === null) {
      return undefined;
    }

    let cancelled = false;

    // Read once — see this hook's own doc: a broadcast question is settled.
    getDoc(getDocumentRef(QUESTION_COLLECTION, questionId, questionConverter))
      .then(async (snapshot) => {
        const question = snapshot.data() ?? null;
        const authorName = question === null ? null : await readAuthorName(question.author_id);

        if (!cancelled) {
          setQuestionState({ questionId, question, authorName, failed: false });
        }
      })
      .catch((error: unknown) => {
        console.warn('[daily-question] could not load the question', questionId, error);

        if (!cancelled) {
          setQuestionState({ questionId, question: null, authorName: null, failed: true });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [ questionId ]);

  const answerKey = `${date}:${userId ?? ''}`;

  useEffect(() => {
    if (userId === null) {
      return undefined;
    }

    return onSnapshot(
      getSubDocumentRef(
        DAILY_QUESTION_COLLECTION,
        date,
        DAILY_QUESTION_ANSWER_COLLECTION,
        userId,
        dailyQuestionAnswerConverter,
      ),
      (snapshot) => setAnswerState({ key: answerKey, answer: snapshot.data() ?? null }),
      (error) => {
        // The day itself still renders: not knowing whether it was answered is
        // worth an unanswered-looking sheet, not an error screen — a second
        // answer would be refused by the rules anyway.
        console.warn('[daily-question] lost the answer subscription', date, error);
      },
    );
  }, [ date, userId, answerKey ]);

  const question = questionState?.questionId === questionId ? questionState : null;

  return {
    status: statusOf(day, question),
    dailyQuestion: day?.dailyQuestion ?? null,
    question: question?.question ?? null,
    answer: answerState?.key === answerKey ? answerState.answer : null,
    authorName: question?.authorName ?? null,
  };
};
