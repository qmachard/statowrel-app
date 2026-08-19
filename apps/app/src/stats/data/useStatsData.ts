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
import { getDoc } from 'firebase/firestore';
import { useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '@/auth/AuthContext';
import { startOfDay, startOfMonth, toDateKey } from '@/lib/dates';
import { getDocumentRef, getSubDocumentRef } from '@/lib/firestore';

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
 * A month of calendar, in **two reads** — one shared document listing the days
 * that had a question, one private document listing the days this user
 * answered.
 *
 * That is the whole reason both monthly documents exist. Read from the answers
 * themselves, the same month costs one read per answered day, plus the day
 * document and the question behind each of them to resolve its `stat_label`,
 * plus a month of `v1_daily_questions` to tell a missed day from a day that
 * never had a question — around ninety reads, and again on every chevron.
 */
const loadCalendarMonth = async (userId: string, monthKey: string): Promise<CalendarMonth> => {
  const [ published, answered ] = await Promise.all([
    getDoc(getDocumentRef(DAILY_QUESTION_MONTH_COLLECTION, monthKey, dailyQuestionMonthConverter)),
    getDoc(getSubDocumentRef(USER_COLLECTION, userId, USER_CALENDAR_MONTH_COLLECTION, monthKey, userCalendarMonthConverter)),
  ]);

  return {
    key: monthKey,
    published: published.data()?.days ?? {},
    answered: answered.data()?.days ?? {},
  };
};

/**
 * Where the Stats screen gets its data.
 *
 * The profile comes from `AuthContext`, which already holds `v1_users/{uid}` —
 * so the streak, the record and the answered-days total cost nothing here. Only
 * the displayed month is fetched, and only the first time it is displayed.
 *
 * Months already visited are kept for the rest of the screen's life: a past
 * month of the shared document is frozen once the month is over, and going back
 * to one should not cost a read. Everything is keyed by user as well as by
 * month, so nothing of a signed-out account can be served to the next one.
 *
 * When the answer flow lands (docs/prd.md §5.4), answering a day — today's
 * question or a catch-up on an older one — has to drop that month from the
 * cache, since the trigger will have rewritten it behind the app's back.
 */
export const useStatsData = () => {
  const { user, profile } = useAuth();
  const userId = user?.uid ?? null;

  const today = useMemo(() => startOfDay(new Date()), []);
  const todayKey = toDateKey(today);
  const [ month, selectMonth ] = useState(() => startOfMonth(today));
  const monthKey = monthKeyOf(toDateKey(month));
  const cacheKeyOf = (key: string) => `${userId ?? ''}:${key}`;
  const cacheKey = cacheKeyOf(monthKey);

  const [ months, setMonths ] = useState<Record<string, CalendarMonth>>({});
  // Months whose read has been started, so flipping back and forth between two
  // of them while the first is still in flight does not fetch it twice.
  const requested = useRef(new Set<string>());

  useEffect(() => {
    if (userId === null || requested.current.has(cacheKey)) {
      return;
    }

    requested.current.add(cacheKey);

    let cancelled = false;

    loadCalendarMonth(userId, monthKey)
      .then((loaded) => {
        if (!cancelled) {
          setMonths((current) => ({ ...current, [cacheKey]: loaded }));
        }
      })
      .catch((error) => {
        // An unreachable month must not take the screen down with it: the
        // streak and the counters above the calendar are already on screen, and
        // dropping the month from the requested set lets a later visit retry.
        requested.current.delete(cacheKey);
        console.warn('[stats] could not load the calendar month', monthKey, error);
      });

    return () => {
      cancelled = true;
    };
  }, [ userId, monthKey, cacheKey ]);

  // The banner reads the *current* month, not the displayed one — browsing back
  // to March must not make today's question disappear from the top of the
  // screen. It costs nothing: the screen opens on the current month, so that
  // document is already loaded and cached by the time anyone navigates away.
  const currentMonth = months[cacheKeyOf(monthKeyOf(todayKey))];
  const todayMonthDayKey = monthDayKeyOf(todayKey);

  return {
    /** `v1_users/{uid}`, or null while it loads — and until the onboarding sheet has created it. */
    profile,
    today,
    month,
    selectMonth,
    /**
     * The displayed month. Empty until its read lands, which renders as an
     * inert month rather than as a wrong one — the key always follows `month`.
     */
    calendar: months[cacheKey] ?? emptyMonth(monthKey),
    /** Today's question, straight off the month index — `null` before the 07:00 drop. */
    todayQuestion: currentMonth?.published[todayMonthDayKey] ?? null,
    answeredToday: currentMonth?.answered[todayMonthDayKey] !== undefined,
    loading: userId !== null && months[cacheKey] === undefined,
  };
};
