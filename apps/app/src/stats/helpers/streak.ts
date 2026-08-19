import type { UserData } from '@statowrel/models';

import { addDays, toDateKey } from '@/lib/dates';

/**
 * The streak to show, given the day the app is being opened on.
 *
 * `streak_count` is only ever moved by the answer trigger, which runs when
 * somebody answers — so between a missed day and the next answer it still holds
 * yesterday's value, and would proudly display a streak that is already broken.
 * The midnight scheduler that resets it (docs/prd.md §4.6) does not exist yet,
 * and even once it does, this stays the honest reading: a streak is alive only
 * if its last on-time answer was today or yesterday.
 */
export const resolveStreakCount = (
  { streak_count, streak_last_answered_on }: Pick<UserData, 'streak_count' | 'streak_last_answered_on'>,
  today: Date,
): number => {
  const lastAnsweredOn = streak_last_answered_on ?? null;

  if (lastAnsweredOn === null) {
    return 0;
  }

  return lastAnsweredOn === toDateKey(today) || lastAnsweredOn === toDateKey(addDays(today, -1))
    ? streak_count
    : 0;
};
