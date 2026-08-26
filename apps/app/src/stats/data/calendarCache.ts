import {
  DAILY_QUESTION_MONTH_COLLECTION,
  type DailyQuestionMonthDayData,
  dailyQuestionMonthConverter,
  USER_CALENDAR_MONTH_COLLECTION,
  USER_COLLECTION,
  type UserCalendarMonthDayData,
  userCalendarMonthConverter,
} from '@statowrel/models';
import { getDoc } from '@react-native-firebase/firestore';

import { isPastMonth } from '@/lib/dates';
import { getDocumentRef, getFrozenDoc, getSubDocumentRef } from '@/lib/firestore';

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
  /**
   * How many accepted friends answered each day, off the same document
   * `answered` comes from — so the badge of docs/prd.md §5.2 costs no read of
   * its own.
   *
   * It only ever goes up (see `v1_user_calendar_month.ts`), and it moves from
   * the *outside*: a friend answering writes it. Which is why it is not
   * subscribed to either — the month's refresh policy below is what picks it
   * up, so a friend answering while the screen is up shows on the next return
   * to it or the next pull.
   */
  friendAnswers: Record<string, number>;
}

export const emptyCalendarMonth = (key: string): CalendarMonth => ({
  key,
  published: {},
  answered: {},
  friendAnswers: {},
});

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
 * it. Those are the whole refresh policy; see `useStatsData`. The badge counter
 * is the one thing in a month that somebody else writes, and it is picked up by
 * those same two occasions rather than by a listener of its own.
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

/**
 * The two documents a month is, read side by side — and read differently, which
 * is the one asymmetry worth stating.
 *
 * The **shared half** is frozen once the month is over: `v1_daily_question_months`
 * is written by the 07:00 draw and by nothing else, so a past month is the same
 * document for everybody, forever. That is what `getFrozenDoc` needs, and it is
 * what makes walking back through the archive cost nothing from the second
 * launch onwards — the SDK's disk cache answers, and survives the relaunch this
 * module-level map does not.
 *
 * The **user's own half** is not frozen and never will be: a catch-up answer
 * (docs/prd.md §4.2) adds an entry to a month long closed, and
 * `friend_answer_counts` moves from the outside every time an accepted friend
 * answers — which is precisely the counter the calendar badge is read from. So
 * it stays a plain `getDoc`, server first, at the two occasions `useStatsData`
 * re-reads a month.
 */
const fetchCalendarMonth = async (userId: string, monthKey: string): Promise<CalendarMonth> => {
  const publishedRef = getDocumentRef(DAILY_QUESTION_MONTH_COLLECTION, monthKey, dailyQuestionMonthConverter);

  const [ published, answered ] = await Promise.all([
    isPastMonth(monthKey) ? getFrozenDoc(publishedRef) : getDoc(publishedRef),
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
    friendAnswers: answered.data()?.friend_answer_counts ?? {},
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
