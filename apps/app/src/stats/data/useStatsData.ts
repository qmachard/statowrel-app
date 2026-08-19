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
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';

import { useAuth } from '@/auth/AuthContext';
import { readAnswer, subscribeToAnswers } from '@/daily-question/data/answerStore';
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

const cacheKeyOf = (userId: string, monthKey: string) => `${userId}:${monthKey}`;

/**
 * Months whose read is stale and has to be paid for again.
 *
 * Module scope rather than a ref, because whoever invalidates a month is not
 * the screen holding it: answering happens on the question sheet
 * (`submitAnswer`), one route above the Stats screen that stays mounted
 * underneath. The set is small — a month is dropped from it as soon as it is
 * re-read — and it is keyed by user, so nothing of a signed-out account can be
 * served to the next one.
 */
const stale = new Set<string>();

// Bumped on every invalidation, and subscribed to below, so that a mounted
// Stats screen re-runs its read: the month it is showing has not changed, and
// nothing else would wake the effect that fetches it.
let staleVersion = 0;
const listeners = new Set<() => void>();

const subscribeToStale = (listener: () => void): (() => void) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

const readStaleVersion = () => staleVersion;

/**
 * Forgets a month of calendar, so the Stats screen reads it again.
 *
 * Call it after answering: the answer trigger projects the day into
 * `v1_users/{uid}/v1_user_calendar_months/{YYYY-MM}` behind the app's back, and
 * a cache built to make a chevron free would otherwise keep showing the month
 * as it was before the answer, for as long as the screen lives.
 */
export const invalidateCalendarMonth = (userId: string, date: string): void => {
  stale.add(cacheKeyOf(userId, monthKeyOf(date)));
  staleVersion += 1;
  listeners.forEach((listener) => listener());
};

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
 * The one thing that drops a month from that cache is answering a day of it —
 * today's question or a catch-up on an older one — through
 * `invalidateCalendarMonth`, since the trigger rewrites the month behind the
 * app's back.
 */
export const useStatsData = () => {
  const { user, profile } = useAuth();
  const userId = user?.uid ?? null;

  const today = useMemo(() => startOfDay(new Date()), []);
  const todayKey = toDateKey(today);
  const [ month, selectMonth ] = useState(() => startOfMonth(today));
  const monthKey = monthKeyOf(toDateKey(month));
  const cacheKey = cacheKeyOf(userId ?? '', monthKey);

  const [ months, setMonths ] = useState<Record<string, CalendarMonth>>({});
  // Months whose read has been started, so flipping back and forth between two
  // of them while the first is still in flight does not fetch it twice.
  const requested = useRef(new Set<string>());

  // Answering does not change the displayed month, so the effect below has to
  // be woken by something else — see `invalidateCalendarMonth`.
  const version = useSyncExternalStore(subscribeToStale, readStaleVersion);
  // And the banner has to fall the moment an answer is written, whether or not
  // the month index behind it has caught up.
  useSyncExternalStore(subscribeToAnswers, () => readAnswer(userId, toDateKey(today)));

  // Guards the state update alone, and only against unmounting: a read that
  // lands after the user has flipped to another month is still correct, since
  // every result is filed under its own key.
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (userId === null) {
      return;
    }

    // A month the user has just answered has to be paid for again. The stale
    // copy stays on screen until the fresh one lands: one day of it is wrong,
    // and blanking the calendar to say so would be worse.
    if (stale.has(cacheKey)) {
      stale.delete(cacheKey);
      requested.current.delete(cacheKey);
    }

    if (requested.current.has(cacheKey)) {
      return;
    }

    requested.current.add(cacheKey);

    loadCalendarMonth(userId, monthKey)
      .then((loaded) => {
        if (mounted.current) {
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
  }, [ userId, monthKey, cacheKey, version ]);

  // The banner reads the *current* month, not the displayed one — browsing back
  // to March must not make today's question disappear from the top of the
  // screen. It costs nothing: the screen opens on the current month, so that
  // document is already loaded and cached by the time anyone navigates away.
  const currentMonth = months[cacheKeyOf(userId ?? '', monthKeyOf(todayKey))];
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
    // The month index is written by the answer trigger, which has not
    // necessarily run yet when the user comes back from the sheet — so an
    // answer given during this session counts on its own.
    answeredToday: currentMonth?.answered[todayMonthDayKey] !== undefined
      || readAnswer(userId, todayKey) !== null,
    loading: userId !== null && months[cacheKey] === undefined,
  };
};
