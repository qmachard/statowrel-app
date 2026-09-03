import { monthDayKeyOf, monthKeyOf } from '@statowrel/models';

import { invalidateCalendarMonth } from '@/stats/data/calendarCache';

/**
 * The jokers spent during this app session — the mirror of `answerStore` for
 * days passed with a joker (docs/prd.md §4.8).
 *
 * The Stats screen cannot read a fresh joker back in time either: the callable
 * writes the joker document and projects the day into
 * `v1_users/{uid}/v1_user_calendar_months` server-side, and the calendar the
 * screen already holds is a copy taken before either landed. Same trade as an
 * answer: the month is dropped from the calendar cache the moment the joker
 * lands, and the day is kept here so the calendar's `jokered` cell paints on
 * the tap rather than on the round trip.
 *
 * The question sheet leans on it too — the joker button hides, and the sheet
 * flips to the joker result — so the flip is instant and cross-session
 * detection still comes from Firestore on the next read of the calendar
 * month.
 *
 * A session-lifetime map, since a joker is written once and never updated —
 * same discipline as `answerStore`.
 */
interface SessionJoker {
  userId: string;
  date: string;
  usedAt: string;
}

const jokers = new Map<string, SessionJoker>();
const listeners = new Set<() => void>();
let version = 0;

const keyOf = (userId: string, date: string) => `${userId}:${date}`;

/** Records the joker this session just spent. */
export const rememberJoker = (userId: string, date: string, usedAt: string): void => {
  jokers.set(keyOf(userId, date), { userId, date, usedAt });

  invalidateCalendarMonth(userId, monthKeyOf(date));

  version += 1;
  listeners.forEach((listener) => listener());
};

export const subscribeToJokers = (listener: () => void): (() => void) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

/** How many jokers this session has spent — the snapshot `useSyncExternalStore` reads. */
export const getJokersVersion = (): number => version;

/** Whether this session spent a joker on `date` for `userId`. */
export const hasJoker = (userId: string | null, date: string): boolean => (
  userId !== null && jokers.has(keyOf(userId, date))
);

/**
 * The days of `monthKey` this session jokered, keyed the way a calendar month
 * keys its own — ready to be merged over the `jokered` half of a month read
 * before the trigger caught up.
 */
export const readJokerDays = (
  userId: string | null,
  monthKey: string,
): Record<string, { used_at: string }> => {
  if (userId === null) {
    return {};
  }

  return [ ...jokers.values() ].reduce<Record<string, { used_at: string }>>((days, stored) => {
    if (stored.userId === userId && monthKeyOf(stored.date) === monthKey) {
      days[monthDayKeyOf(stored.date)] = { used_at: stored.usedAt };
    }

    return days;
  }, {});
};
