import {
  DAILY_QUESTION_MONTH_COLLECTION,
  type DailyQuestionMonthDayData,
  dailyQuestionMonthConverter,
  USER_CALENDAR_MONTH_COLLECTION,
  USER_COLLECTION,
  type UserCalendarMonthDayData,
  userCalendarMonthConverter,
} from '@statowrel/models';
import { getDoc } from 'firebase/firestore';

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

export const emptyCalendarMonth = (key: string): CalendarMonth => ({ key, published: {}, answered: {} });

/**
 * The calendar months this app run has read, and the only place they are held.
 *
 * **A month costs two documents, and that is the point.** Read from the answers
 * themselves, the same month costs one read per answered day, plus the question
 * behind each of them to resolve its `stat_label`, plus a lookup per day to
 * tell a missed day from a day that never had a question — dozens of reads, and
 * again on every chevron.
 *
 * The cache is what makes those two reads happen once rather than on every
 * mount, every chevron back and forth and every return to the screen. It lives
 * at module level so it survives a remount, and is keyed by user *and* month so
 * switching account can never show the previous one's calendar.
 *
 * It is an **external store**, not a hook's state: `useStatsData` reads it
 * through `useSyncExternalStore`, so a month landing — or being invalidated
 * from the question sheet, which is not the Stats screen's own render — moves
 * every screen showing it without anyone pushing it into React state. A cached
 * month keeps its reference until it is read again, which is the stable
 * snapshot that store owes React.
 *
 * Nothing here expires on a clock. A month leaves the cache when something the
 * app did makes it wrong (`invalidateCalendarMonth`, on an answer), and is read
 * again when the user asks for it — pulling the screen down, or coming back to
 * it. Those are the whole refresh policy; see `useStatsData`.
 */
const months = new Map<string, CalendarMonth>();

/** Reads already out, so two callers wanting the same month share one round trip. */
const inFlight = new Map<string, Promise<CalendarMonth>>();

/** Months held but known to be behind — read again at the next occasion, shown until then. */
const stale = new Set<string>();

const listeners = new Set<() => void>();

const cacheKeyOf = (userId: string, monthKey: string) => `${userId}:${monthKey}`;

const notify = () => {
  listeners.forEach((listener) => listener());
};

export const subscribeToCalendarCache = (listener: () => void): (() => void) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

/** The cached month, or `null` when it has never been read or has been invalidated. */
export const readCalendarMonth = (userId: string | null, monthKey: string): CalendarMonth | null => (
  userId === null ? null : months.get(cacheKeyOf(userId, monthKey)) ?? null
);

/**
 * Marks a month as behind, so the next read of it goes back to Firestore
 * instead of being served from here.
 *
 * Called when an answer is written: the answer trigger projects the day into
 * `v1_users/{uid}/v1_user_calendar_months` a beat later, which makes the copy
 * held here stale the moment the app writes.
 *
 * Marked, not dropped, and deliberately silent: throwing the month away would
 * blank the calendar behind the question sheet until the next read lands. What
 * the user answered is already on screen — `answerStore` lays this session's
 * answers over the month — so there is nothing to show in the meantime but the
 * month itself.
 */
export const invalidateCalendarMonth = (userId: string, monthKey: string): void => {
  stale.add(cacheKeyOf(userId, monthKey));
};

const fetchCalendarMonth = async (userId: string, monthKey: string): Promise<CalendarMonth> => {
  const [ published, answered ] = await Promise.all([
    getDoc(getDocumentRef(DAILY_QUESTION_MONTH_COLLECTION, monthKey, dailyQuestionMonthConverter)),
    getDoc(getSubDocumentRef(
      USER_COLLECTION,
      userId,
      USER_CALENDAR_MONTH_COLLECTION,
      monthKey,
      userCalendarMonthConverter,
    )),
  ]);

  return {
    key: monthKey,
    published: published.data()?.days ?? {},
    answered: answered.data()?.days ?? {},
  };
};

/**
 * Makes sure a month is in the cache and up to date, and tells its subscribers
 * when a fresh one lands.
 *
 * A cached month is left alone unless it has been invalidated, or unless
 * `force` — which is what a refresh means: go back to Firestore whatever is
 * held.
 *
 * Never rejects, and never caches a failure: an unreachable month must not take
 * the screen down with it — the streak and the counters above the calendar are
 * already up — and must leave the next attempt free to retry rather than freeze
 * an empty month in place.
 */
export const loadCalendarMonth = async (userId: string, monthKey: string, force: boolean): Promise<void> => {
  const key = cacheKeyOf(userId, monthKey);

  if (!force && months.has(key) && !stale.has(key)) {
    return;
  }

  const pending = inFlight.get(key);

  if (pending !== undefined) {
    await pending.catch(() => undefined);

    return;
  }

  const request = fetchCalendarMonth(userId, monthKey);

  inFlight.set(key, request);

  try {
    months.set(key, await request);
    stale.delete(key);
    notify();
  } catch (error) {
    console.warn('[stats] could not load the calendar month', monthKey, error);
  } finally {
    inFlight.delete(key);
  }
};
