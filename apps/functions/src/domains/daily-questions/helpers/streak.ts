import type { UserData } from '@statowrel/models';

/** The streak fields of a profile — the only ones the answer trigger moves. */
export type StreakState = Pick<UserData, 'streak_count' | 'streak_best' | 'streak_last_answered_on'>;

/**
 * The `YYYY-MM-DD` key of the day before another one.
 *
 * Computed in UTC on purpose, even though the keys are Paris days: a date-only
 * key carries no time, so UTC arithmetic can never be shifted by a daylight
 * saving change the way a local `Date` would be. `2026-03-30` minus one day is
 * `2026-03-29` in every timezone.
 */
export const previousDayKey = (dateKey: string): string => {
  const [ year, month, day ] = dateKey.split('-').map(Number);

  return new Date(Date.UTC(year, month - 1, day - 1)).toISOString().slice(0, 10);
};

/**
 * The streak a profile reaches by answering `dateKey` on time — docs/prd.md §4.6.
 *
 * Derived from `streak_last_answered_on` rather than trusted from
 * `streak_count`: an answer the day after the last one continues the streak,
 * anything further back restarts it at 1. That makes the count self-correcting,
 * whether or not the midnight scheduler got to reset it in between.
 *
 * Only ever called for an on-time answer. A catch-up answer completes the
 * calendar and never touches the streak, so it never reaches here — which is
 * also why a day already behind `streak_last_answered_on` returns the state
 * untouched rather than restarting it.
 */
export const nextStreakState = (current: StreakState, dateKey: string): StreakState => {
  const lastAnsweredOn = current.streak_last_answered_on ?? null;

  // Every branch rebuilds the three fields rather than handing `current` back:
  // the result is spread straight into an `update()` payload, and `current` is
  // the whole profile at the call site.
  if (lastAnsweredOn !== null && lastAnsweredOn >= dateKey) {
    return {
      streak_count: current.streak_count,
      streak_best: current.streak_best,
      streak_last_answered_on: lastAnsweredOn,
    };
  }

  const streakCount = lastAnsweredOn === previousDayKey(dateKey) ? current.streak_count + 1 : 1;

  return {
    streak_count: streakCount,
    streak_best: Math.max(current.streak_best, streakCount),
    streak_last_answered_on: dateKey,
  };
};
