import { getDoc, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import {
  DAILY_QUESTION_ANSWER_COLLECTION,
  DAILY_QUESTION_MONTH_COLLECTION,
  type DailyQuestionAnswerData,
  QUESTION_COLLECTION,
  type QuestionData,
  USER_COLLECTION,
  dailyQuestionAnswerConverter,
  dailyQuestionMonthConverter,
  monthDayKeyOf,
  monthKeyOf,
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
 *   publication incident), so the month index has no entry for it. The calendar
 *   already renders such a day as inert.
 * - `unpublished` — the month points at a question whose 07:00 drop time hasn't
 *   come. The scheduler stamps and indexes in the same batch, so this only
 *   shows up on a clock a few seconds ahead of the server's — the model still
 *   allows a `broadcast_at` in the future, and reading the question then would
 *   be denied by `firestore.rules` anyway.
 */
export type DailyQuestionStatus = 'loading' | 'ready' | 'unpublished' | 'missing' | 'error';

export interface DailyQuestionView {
  status: DailyQuestionStatus;
  /** The day's question, live — `answer_counts` moves on it as answers come in. */
  question: QuestionData | null;
  /** Document id of that question, and the parent an answer is written under. */
  questionId: string | null;
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
  /** The question broadcast that day, from the month index — `null` for a day that never had one. */
  questionId: string | null;
  failed: boolean;
}

interface QuestionState {
  questionId: string;
  question: QuestionData | null;
  /** Whether the 07:00 drop time has come — decided here, where the clock is worth reading. */
  published: boolean;
  failed: boolean;
}

const statusOf = (day: DayState | null, question: QuestionState | null): DailyQuestionStatus => {
  if (day === null) {
    return 'loading';
  }

  if (day.failed) {
    return 'error';
  }

  if (day.questionId === null) {
    return 'missing';
  }

  if (question === null) {
    return 'loading';
  }

  if (question.failed) {
    return 'error';
  }

  if (question.question === null) {
    return 'missing';
  }

  return question.published ? 'ready' : 'unpublished';
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
 * Three documents, and none of them is a per-day one — there isn't any. The
 * month index (`v1_daily_question_months/{YYYY-MM}`) is what says which
 * question ran a day, that `v1_questions` document is the day, and the current
 * user's answer sits under it — with their UID as its document id, so "already
 * answered" is a single document rather than a query.
 *
 * Two of the three are **subscribed to**, the third is read once:
 *
 * - **The question**, because `answer_counts` moves every time anybody answers,
 *   and the StatOwrel card's rarity is that map's shape at display time
 *   (docs/prd.md §5.5). It also makes the 07:00 drop land on a screen that is
 *   already open, instead of on the next time it is opened.
 * - **The answer**, because it is what flips the sheet to its answered state.
 *   Firestore hands a local write to its own listeners before the round trip,
 *   so the flip happens on the tap rather than on the server.
 * - **The month index** is read once: an entry is written when the day is drawn
 *   and never rewritten, so a day's question never changes under the screen.
 */
export const useDailyQuestion = (date: string): DailyQuestionView => {
  const { user } = useAuth();
  const userId = user?.uid ?? null;

  const [ dayState, setDayState ] = useState<DayState | null>(null);
  const [ questionState, setQuestionState ] = useState<QuestionState | null>(null);
  const [ authorState, setAuthorState ] = useState<{ authorId: string; name: string | null } | null>(null);
  const [ answerState, setAnswerState ] = useState<{ key: string; answer: DailyQuestionAnswerData | null } | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Read once — see this hook's own doc: a day's entry never changes.
    getDoc(getDocumentRef(DAILY_QUESTION_MONTH_COLLECTION, monthKeyOf(date), dailyQuestionMonthConverter))
      .then((snapshot) => {
        if (!cancelled) {
          setDayState({
            date,
            questionId: snapshot.data()?.days[monthDayKeyOf(date)]?.question_id ?? null,
            failed: false,
          });
        }
      })
      .catch((error: unknown) => {
        console.warn('[daily-question] could not load the day\'s month', date, error);

        if (!cancelled) {
          setDayState({ date, questionId: null, failed: true });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [ date ]);

  const day = dayState?.date === date ? dayState : null;
  const questionId = day?.questionId ?? null;

  useEffect(() => {
    if (questionId === null) {
      return undefined;
    }

    return onSnapshot(
      getDocumentRef(QUESTION_COLLECTION, questionId, questionConverter),
      (snapshot) => {
        const question = snapshot.data() ?? null;

        setQuestionState({
          questionId,
          question,
          published: question?.broadcast_at != null && new Date(question.broadcast_at) <= new Date(),
          failed: false,
        });
      },
      (error) => {
        console.warn('[daily-question] lost the question subscription', questionId, error);
        setQuestionState({ questionId, question: null, published: false, failed: true });
      },
    );
  }, [ questionId ]);

  const question = questionState?.questionId === questionId ? questionState : null;
  const authorId = question?.question?.author_id ?? null;

  // The credit is its own read, keyed by the author rather than by the day: the
  // author of a broadcast question never changes, so it survives every
  // `answer_counts` snapshot the subscription above hands over.
  useEffect(() => {
    if (authorId === null) {
      return undefined;
    }

    let cancelled = false;

    void readAuthorName(authorId).then((name) => {
      if (!cancelled) {
        setAuthorState({ authorId, name });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [ authorId ]);

  const answerKey = `${questionId ?? ''}:${userId ?? ''}`;

  useEffect(() => {
    if (userId === null || questionId === null) {
      return undefined;
    }

    return onSnapshot(
      getSubDocumentRef(
        QUESTION_COLLECTION,
        questionId,
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
  }, [ date, userId, questionId, answerKey ]);

  return {
    status: statusOf(day, question),
    question: question?.question ?? null,
    questionId,
    answer: answerState?.key === answerKey ? answerState.answer : null,
    authorName: authorState?.authorId === authorId ? authorState.name : null,
  };
};
