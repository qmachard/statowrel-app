import { type UserData, previousDayKey } from '@statowrel/models';

/**
 * The streak to show, given the day the screen is being rendered on.
 *
 * `streak_count` is only ever moved by the answer trigger, which runs when
 * somebody answers — so between a missed day and the next answer it still holds
 * yesterday's value, and would proudly display a streak that is already broken.
 * The midnight scheduler that resets it (docs/prd.md §4.6) does not exist yet,
 * and even once it does, this stays the honest reading: a streak is alive only
 * if its last on-time answer was today or yesterday.
 *
 * `todayKey` is a **Paris** day key, and it has to be recomputed at every
 * render rather than captured once. `streak_last_answered_on` is the day key
 * the answer trigger wrote — Paris', the one the day documents are keyed by
 * (docs/prd.md §7) — so comparing it against the device's own calendar, or
 * against the day the screen happened to mount on, reads a live streak as
 * broken: an app left open overnight would show 0 the moment its owner answers
 * the next morning.
 */
export const resolveStreakCount = (
  { streak_count, streak_last_answered_on }: Pick<UserData, 'streak_count' | 'streak_last_answered_on'>,
  todayKey: string,
): number => {
  const lastAnsweredOn = streak_last_answered_on ?? null;

  if (lastAnsweredOn === null) {
    return 0;
  }

  return lastAnsweredOn === todayKey || lastAnsweredOn === previousDayKey(todayKey)
    ? streak_count
    : 0;
};
