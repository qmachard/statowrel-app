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
  /**
   * Whether `question.answer_counts` was read **before** this session's own
   * answer landed in it — in which case the card has to fold that answer in
   * itself, or show a percentage one answer short (`buildStatOwrel`).
   *
   * True only on proof, never on a guess: it takes an answer this session
   * wrote, and a read of that answer, chained to the very tally being shown,
   * that still finds no `counted_at` on it. Anything else — an answer from an
   * earlier session, a read that belongs to an older tally, a marker already
   * stamped — reads false, so the count can only ever fall one short for a beat
   * and never count the same answer twice.
   */
  ownAnswerPending: boolean;
  /**
   * Whether the numbers a card built from `question.answer_counts` would show
   * are the ones it will keep — false while the read that decides
   * `ownAnswerPending` is still out.
   *
   * It exists for the beat that follows an answer, and it is a display concern
   * rather than a data one: the tally is re-read the moment the answer is
   * written, and the answer right behind it, so a card shown before the two
   * have landed moves twice under the eyes of whoever just answered. The screen
   * holds the result until this turns true — the confirmation animation is
   * playing over that beat anyway — rather than animating a percentage that was
   * never true (docs/prd.md §5.5).
   *
   * A day answered in an earlier session settles immediately: there is nothing
   * to wait for when nothing was just written.
   */
  resultSettled: boolean;
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

interface AnswerState {
  key: string;
  answer: DailyQuestionAnswerData | null;
  /**
   * The question state this read was chained to — what makes the read *newer*
   * than a given tally, and `null` for the read fired on the way in, which is
   * chained to nothing and races the question's own.
   */
  readAgainst: QuestionState | null;
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
 * - **The answer** flips the sheet from `answerStore`, which holds what this
 *   session wrote — so the flip happens on the tap and not on a round trip —
 *   and is read with `getFrozenDoc` otherwise. No client ever rewrites an
 *   answer, so a day already read on this device is answered from the SDK's
 *   disk cache and costs nothing to reopen; the one write it does receive is
 *   the trigger's `counted_at`, which is also why a cached copy is only trusted
 *   once it carries that marker.
 *
 *   That marker is what `ownAnswerPending` is decided on, and it is the whole
 *   reason the answer is read a second time after an answer is written. The
 *   tally read at the door is one answer short of the truth until the trigger
 *   has run — a percentage that is visibly wrong on a quiet morning — and
 *   `counted_at` is stamped in the very transaction that increments it. So the
 *   screen reads the tally first and the answer second: a marker still absent
 *   on a read **chained to that tally** proves the tally was taken without this
 *   answer, and the card folds it in itself. Chained is the load-bearing word —
 *   a read fired alongside the tally rather than after it proves nothing, and
 *   is treated as proving nothing.
 * - **The month index** is read once: an entry is written when the day is drawn
 *   and never rewritten, so a day's question never changes under the screen.
 */
export const useDailyQuestion = (date: string): DailyQuestionView => {
  const { user } = useAuth();
  const userId = user?.uid ?? null;

  const [ dayState, setDayState ] = useState<DayState | null>(null);
  const [ questionState, setQuestionState ] = useState<QuestionState | null>(null);
  const [ authorState, setAuthorState ] = useState<{ authorId: string; name: string | null } | null>(null);
  const [ answerState, setAnswerState ] = useState<AnswerState | null>(null);

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

  const answerRead = answerState?.key === answerKey ? answerState : null;

  // Whether the answer on hand carries the trigger's marker, and whether it was
  // read against the tally being shown — the two halves of everything below.
  const ownAnswerCounted = (answerRead?.answer?.counted_at ?? null) !== null;
  const readAgainstThisTally = answerRead?.readAgainst === questionState;

  // True while this session's own answer is not provably in the tally being
  // shown. `counted_at` is stamped by the answer trigger in the transaction
  // that increments `answer_counts`, so a marker that is absent on a read
  // **chained to this tally** — fired once that tally had landed, never
  // alongside it — proves the tally was taken without this answer. Every other
  // state answers false, which is the safe half of the question: the count may
  // sit one short for a beat, it can never count somebody twice.
  const ownAnswerPending = sessionAnswer !== null && !ownAnswerCounted && readAgainstThisTally;

  // Nothing left to learn about this tally: nothing was written this session, or
  // the marker is in — once stamped it holds for every tally read afterwards —
  // or the read on hand belongs to this one.
  const resultSettled = sessionAnswer === null || ownAnswerCounted || readAgainstThisTally;

  // Read once on the way in, and again — chained to each new tally — until it
  // settles. A day nobody answered, or one whose answer is long counted, is read
  // once and left alone: the re-read is there to watch a marker arrive, not to
  // poll a document.
  const needsAnswerRead = answerRead === null || !resultSettled;

  useEffect(() => {
    if (userId === null || questionId === null || !needsAnswerRead) {
      return undefined;
    }

    let cancelled = false;
    const readAgainst = questionState;

    getFrozenDoc(
      getSubDocumentRef(
        QUESTION_COLLECTION,
        questionId,
        DAILY_QUESTION_ANSWER_COLLECTION,
        userId,
        dailyQuestionAnswerConverter,
      ),
      // A cached answer is only settled once it carries its marker: the trigger
      // writes it a beat after the answer is created, so a copy taken in that
      // beat would answer « not counted » for ever (`getFrozenDoc`).
      (data) => data.counted_at !== null,
    )
      .then((snapshot) => {
        if (!cancelled) {
          setAnswerState({ key: answerKey, answer: snapshot.data() ?? null, readAgainst });
        }
      })
      .catch((error: unknown) => {
        // The day itself still renders: not knowing whether it was answered is
        // worth an unanswered-looking sheet, not an error screen — a second
        // answer would be refused by the rules anyway.
        console.warn('[daily-question] could not read the answer', date, error);

        // Stamped all the same, which is what keeps `resultSettled` from
        // waiting on a read that will never land: offline, the tally on hand is
        // the one read before this session wrote its answer, so folding that
        // answer in is right — and the screen has a result to show rather than
        // a question it has already answered.
        if (!cancelled) {
          setAnswerState((current) => ({
            key: answerKey,
            answer: current?.key === answerKey ? current.answer : null,
            readAgainst,
          }));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [ date, userId, questionId, answerKey, questionState, needsAnswerRead ]);

  return {
    status: statusOf(day, question),
    question: question?.question ?? null,
    questionId,
    // The document wins once it has been read: it is the one carrying the
    // trigger's marker. The session's own answer is what stands in until then,
    // so the sheet flips on the tap rather than on a round trip.
    answer: answerRead?.answer ?? sessionAnswer,
    ownAnswerPending,
    resultSettled,
    authorName: authorState?.authorId === authorId ? authorState.name : null,
    refresh,
  };
};
