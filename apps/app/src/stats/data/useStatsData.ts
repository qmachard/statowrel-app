import {
  DAILY_QUESTION_MONTH_COLLECTION,
  type DailyQuestionMonthDayData,
  dailyQuestionMonthConverter,
  monthDayKeyOf,
  monthKeyOf,
  USER_CALENDAR_MONTH_COLLECTION,
  USER_COLLECTION,
  type UserCalendarMonthDayData,
  userCalendarMonthConverter,
} from '@statowrel/models';
import { getDoc, getDocs, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';

import { useAuth } from '@/auth/AuthContext';
import { readAnswer, subscribeToAnswers } from '@/daily-question/data/answerStore';
import { startOfDay, startOfMonth, toDateKey } from '@/lib/dates';
import { getCollectionRef, getDocumentRef, getSubDocumentRef } from '@/lib/firestore';

/**
 * One month of the Stats calendar, as the screen consumes it — the two halves
 * of docs/prd.md §5.2, keyed the same way so a day of the month reads both.
 */
export interface CalendarMonth {
  /** `YYYY-MM` — always the month currently displayed, even while it is still loading. */
  key: string;
  /** Days that had a question broadcast, from `v1_daily_question_months`. */
  published: Record<string, DailyQuestionMonthDayData>;
  /** Days this user answered, from `v1_users/{uid}/v1_user_calendar_months`. */
  answered: Record<string, UserCalendarMonthDayData>;
}

const emptyMonth = (key: string): CalendarMonth => ({ key, published: {}, answered: {} });

/**
 * The `YYYY-MM` of the very first month a question was ever broadcast in — how
 * far back the calendar lets one walk (docs/prd.md §5.2), and `null` while it
 * loads or when nothing has ever been published.
 *
 * The archive is bounded by the questions, not by the account: a user arriving
 * today can catch up on everything that came before them (docs/prd.md §4.2), so
 * the lower bound is the same for everybody. One read, once per session — the
 * first month never moves.
 */
const readArchiveStart = async (): Promise<string | null> => {
  const months = getCollectionRef(DAILY_QUESTION_MONTH_COLLECTION, dailyQuestionMonthConverter);
  const snapshot = await getDocs(query(months, orderBy('month'), limit(1)));

  return snapshot.docs[0]?.id ?? null;
};

const cacheKeyOf = (userId: string, monthKey: string) => `${userId}:${monthKey}`;

const monthRefsOf = (userId: string, monthKey: string) => ({
  published: getDocumentRef(DAILY_QUESTION_MONTH_COLLECTION, monthKey, dailyQuestionMonthConverter),
  answered: getSubDocumentRef(
    USER_COLLECTION,
    userId,
    USER_CALENDAR_MONTH_COLLECTION,
    monthKey,
    userCalendarMonthConverter,
  ),
});

/**
 * Where the Stats screen gets its data.
 *
 * The profile comes from `AuthContext`, which subscribes to `v1_users/{uid}` —
 * so the streak, the record and the answered-days total cost nothing here and
 * move on their own. Only the displayed month is fetched.
 *
 * **A month costs two documents, and that is the point.** Read from the answers
 * themselves, the same month costs one read per answered day, plus the question
 * behind each of them to resolve its `stat_label`, plus a lookup per day to
 * tell a missed day from a day that never had a question — dozens of reads, and
 * again on every chevron.
 *
 * How those two documents are read depends on the month:
 *
 * - **The current month is subscribed to.** It is the only one that changes —
 *   the scheduler adds a day to it at 07:00, and the answer trigger writes the
 *   user's half a beat after the app writes an answer. A subscription is what
 *   makes the calendar fill in behind the sheet instead of waiting for a guess
 *   about when the trigger has caught up, and it costs the same first read a
 *   `getDoc` would, plus one per change.
 * - **A past month is read once and kept.** It is frozen — nothing writes into
 *   a month that is over — so a chevron back to March costs two reads the first
 *   time and nothing afterwards. Leaving a listener open on each visited month
 *   would hold a connection per month to learn about changes that never come.
 */
export const useStatsData = () => {
  const { user, profile } = useAuth();
  const userId = user?.uid ?? null;

  const today = useMemo(() => startOfDay(new Date()), []);
  const todayKey = toDateKey(today);
  const [ month, selectMonth ] = useState(() => startOfMonth(today));
  const monthKey = monthKeyOf(toDateKey(month));
  const cacheKey = cacheKeyOf(userId ?? '', monthKey);
  const isCurrentMonth = monthKey === monthKeyOf(todayKey);

  const [ archiveStart, setArchiveStart ] = useState<string | null>(null);
  const [ months, setMonths ] = useState<Record<string, CalendarMonth>>({});
  // Past months whose read has been started, so flipping back and forth between
  // two of them while the first is still in flight does not fetch it twice.
  const requested = useRef(new Set<string>());

  // The banner falls the moment an answer is written, whether or not the month
  // index behind it has caught up — see `answeredToday` below.
  useSyncExternalStore(subscribeToAnswers, () => readAnswer(userId, todayKey));

  useEffect(() => {
    if (userId === null) {
      return undefined;
    }

    let cancelled = false;

    readArchiveStart()
      .then((firstMonth) => {
        if (!cancelled) {
          setArchiveStart(firstMonth);
        }
      })
      .catch((error: unknown) => {
        // Without it the calendar simply stays on the current month rather than
        // opening onto an archive it cannot bound.
        console.warn('[stats] could not read the first published month', error);
      });

    return () => {
      cancelled = true;
    };
  }, [ userId ]);

  useEffect(() => {
    if (userId === null) {
      return;
    }

    const refs = monthRefsOf(userId, monthKey);

    const merge = (half: Partial<Omit<CalendarMonth, 'key'>>) => {
      setMonths((current) => ({
        ...current,
        [cacheKey]: { ...(current[cacheKey] ?? emptyMonth(monthKey)), ...half },
      }));
    };

    const complain = (error: unknown) => {
      // An unreachable month must not take the screen down with it: the streak
      // and the counters above the calendar are already on screen.
      console.warn('[stats] could not load the calendar month', monthKey, error);
    };

    if (isCurrentMonth) {
      const stopPublished = onSnapshot(
        refs.published,
        (snapshot) => merge({ published: snapshot.data()?.days ?? {} }),
        complain,
      );
      const stopAnswered = onSnapshot(
        refs.answered,
        (snapshot) => merge({ answered: snapshot.data()?.days ?? {} }),
        complain,
      );

      return () => {
        stopPublished();
        stopAnswered();
      };
    }

    if (requested.current.has(cacheKey)) {
      return;
    }

    requested.current.add(cacheKey);

    Promise.all([ getDoc(refs.published), getDoc(refs.answered) ])
      .then(([ published, answered ]) => {
        merge({ published: published.data()?.days ?? {}, answered: answered.data()?.days ?? {} });
      })
      .catch((error: unknown) => {
        // Dropping the month from the requested set lets a later visit retry.
        requested.current.delete(cacheKey);
        complain(error);
      });

    return undefined;
  }, [ userId, monthKey, cacheKey, isCurrentMonth ]);

  const currentMonth = months[cacheKeyOf(userId ?? '', monthKeyOf(todayKey))];
  const todayMonthDayKey = monthDayKeyOf(todayKey);

  return {
    /** `v1_users/{uid}`, live — see `AuthContext`. Null while it loads, and until the onboarding sheet has created it. */
    profile,
    today,
    month,
    selectMonth,
    /**
     * `YYYY-MM` of the oldest month the calendar can reach — the first month a
     * question was broadcast in, whether or not the account existed then.
     */
    archiveStart,
    /**
     * The displayed month. Empty until its read lands, which renders as an
     * inert month rather than as a wrong one — the key always follows `month`.
     */
    calendar: months[cacheKey] ?? emptyMonth(monthKey),
    /**
     * Today's question, straight off the month index — `null` before the 07:00
     * drop, and appearing on its own when the drop lands while the app is open.
     *
     * The banner reads the *current* month, not the displayed one: browsing
     * back to March must not make today's question disappear from the top of
     * the screen.
     */
    todayQuestion: currentMonth?.published[todayMonthDayKey] ?? null,
    // The month index is written by the answer trigger, which has not
    // necessarily run yet when the user comes back from the sheet — so an
    // answer given during this session counts on its own.
    answeredToday: currentMonth?.answered[todayMonthDayKey] !== undefined
      || readAnswer(userId, todayKey) !== null,
    loading: userId !== null && months[cacheKey] === undefined,
  };
};
