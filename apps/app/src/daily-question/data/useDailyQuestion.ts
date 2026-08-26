import { useFocusEffect } from '@react-navigation/native';
import { getDoc } from '@react-native-firebase/firestore';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

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
import { getAnswersVersion, readAnswer, subscribeToAnswers } from '@/daily-question/data/answerStore';
import { isPastMonth } from '@/lib/dates';
import { getDocumentRef, getFrozenDoc, getSubDocumentRef } from '@/lib/firestore';

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
  /** The day's question, as it stood when the day was opened — see the hook's own doc on `answer_counts`. */
  question: QuestionData | null;
  /** Document id of that question, and the parent an answer is written under. */
  questionId: string | null;
  /** The current user's answer, or `null` while the day is still theirs to answer. */
  answer: DailyQuestionAnswerData | null;
  /** Pseudo of whoever proposed the question — the credit of docs/prd.md §5.4. */
  authorName: string | null;
  /**
   * Re-reads the day's tally, out of turn.
   *
   * The screen calls it the moment an answer is written: the card of
   * docs/prd.md §5.5 is a number about everybody else, and the one read at the
   * door can be minutes old by the time the question has been thought about —
   * long enough, at 07:05 on a day nobody has answered yet, for the card to
   * announce « 100% des gens » to the second person of the morning.
   */
  refresh: () => void;
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
 * **None of the three is subscribed to.** The day has to be *fresh when it is
 * opened*, which is not the same requirement as live, and the difference is the
 * whole cost of this screen:
 *
 * - **The question** is read at every opening of the day, and again at every
 *   return to it. `answer_counts` moves on this one document every time anybody
 *   answers anywhere — including on a day long closed, a catch-up answer
 *   counting like any other — so a subscription bills one read per answer of
 *   the entire app for as long as the sheet stays up. That is a cost in the
 *   square of the audience, paid to watch percentages drift by tenths. Read at
 *   the door instead, it is one read per opening, and the rarity of
 *   docs/prd.md §5.5 is still that map's shape at display time.
 *
 *   `useFocusEffect` is what makes "at the door" hold: it fires on the way in,
 *   and again on every return to the day — from the friends sheet, from the
 *   invitation form, from the calendar — which is where the 07:00 drop and the
 *   answers landed since are picked up, rather than on an open connection held
 *   through the hours nothing happens. Same policy the Stats screen already
 *   refreshes its calendar on (`useStatsData`).
 * - **The answer** is this session's own when this session wrote it —
 *   `answerStore` holds it, so the sheet still flips on the tap rather than on
 *   a round trip — and a `getFrozenDoc` otherwise. An answer is never updated
 *   nor deleted (docs/prd.md §4.2, and only the demo's `counted_at` marker ever
 *   rewrites one), so a day already read on this device is answered from the
 *   SDK's disk cache and costs nothing to reopen.
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

    const monthKey = monthKeyOf(date);
    const monthRef = getDocumentRef(DAILY_QUESTION_MONTH_COLLECTION, monthKey, dailyQuestionMonthConverter);

    // Read once — see this hook's own doc: a day's entry never changes. And for
    // a month the device has already left, neither does the document holding
    // them, so it is read off the SDK's disk cache when that holds it: opening
    // a day out of the archive is then a `v1_questions` subscription and
    // nothing else. The current month is re-read, since it gains a day at every
    // 07:00 draw — including one that may have landed while the app slept.
    (isPastMonth(monthKey) ? getFrozenDoc(monthRef) : getDoc(monthRef))
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

  // Nothing is reset on the way in: a re-read that lands on a day already shown
  // replaces its state, and a re-read that fails leaves the day standing rather
  // than blanking a screen that was reading fine a second ago.
  const readQuestion = useCallback(() => {
    if (questionId === null) {
      return undefined;
    }

    let cancelled = false;

    getDoc(getDocumentRef(QUESTION_COLLECTION, questionId, questionConverter))
      .then((snapshot) => {
        if (cancelled) {
          return;
        }

        const question = snapshot.data() ?? null;

        setQuestionState({
          questionId,
          question,
          published: question?.broadcast_at != null && new Date(question.broadcast_at) <= new Date(),
          failed: false,
        });
      })
      .catch((error: unknown) => {
        console.warn('[daily-question] could not read the question', questionId, error);

        if (!cancelled) {
          setQuestionState((current) => (
            current?.questionId === questionId
              ? current
              : { questionId, question: null, published: false, failed: true }
          ));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [ questionId ]);

  useFocusEffect(readQuestion);

  // Same read, out of turn — the cleanup is dropped because there is no render
  // pass to hang it on: a call that lands after the day has changed is written
  // off by the `questionId` its state carries, like every other slice here.
  const refresh = useCallback(() => {
    readQuestion();
  }, [ readQuestion ]);

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

  // The answer this session wrote, if it wrote one. `DailyQuestionScreen` hands
  // it to `answerStore` for the Stats screen underneath, and the sheet reads it
  // back from there: the flip to the result happens on the tap, without the
  // round trip the subscription used to hide it behind, and without a read.
  useSyncExternalStore(subscribeToAnswers, getAnswersVersion);
  const sessionAnswer = readAnswer(userId, date);

  useEffect(() => {
    if (userId === null || questionId === null || sessionAnswer !== null) {
      return undefined;
    }

    let cancelled = false;

    getFrozenDoc(
      getSubDocumentRef(
        QUESTION_COLLECTION,
        questionId,
        DAILY_QUESTION_ANSWER_COLLECTION,
        userId,
        dailyQuestionAnswerConverter,
      ),
    )
      .then((snapshot) => {
        if (!cancelled) {
          setAnswerState({ key: answerKey, answer: snapshot.data() ?? null });
        }
      })
      .catch((error: unknown) => {
        // The day itself still renders: not knowing whether it was answered is
        // worth an unanswered-looking sheet, not an error screen — a second
        // answer would be refused by the rules anyway.
        console.warn('[daily-question] could not read the answer', date, error);
      });

    return () => {
      cancelled = true;
    };
  }, [ date, userId, questionId, answerKey, sessionAnswer ]);

  return {
    status: statusOf(day, question),
    question: question?.question ?? null,
    questionId,
    answer: sessionAnswer ?? (answerState?.key === answerKey ? answerState.answer : null),
    authorName: authorState?.authorId === authorId ? authorState.name : null,
    refresh,
  };
};
