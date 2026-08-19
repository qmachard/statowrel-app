import { DAILY_QUESTION_TIME_ZONE } from '@statowrel/models';

/**
 * Offset between Europe/Paris and UTC at a given instant, in milliseconds.
 *
 * Read from `Intl` rather than hardcoded: Paris is UTC+1 in winter and UTC+2 in
 * summer, and the daily question is drawn every day of the year.
 */
const parisOffsetMs = (instant: Date): number => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: DAILY_QUESTION_TIME_ZONE,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant).reduce<Record<string, string>>((acc, part) => {
    acc[part.type] = part.value;

    return acc;
  }, {});

  const wallClockAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );

  return wallClockAsUtc - instant.getTime();
};

/**
 * The instant a Paris wall-clock time falls on — `parisTimeToInstant('2026-03-29', 8, 30)`
 * is 06:30 UTC in summer time, 07:30 UTC in winter time.
 *
 * The offset is resolved in two passes because it can only be read *from* an
 * instant: the first pass guesses with the offset in effect at the naive UTC
 * value, the second re-reads it at that guess. Around a DST switch the two
 * differ by an hour, and the second pass is the one that lands on the right side.
 *
 * `hour` may exceed 23 — `parisTimeToInstant(date, 24)` is Paris midnight
 * closing that day.
 */
export const parisTimeToInstant = (dateKey: string, hour: number, minute = 0): Date => {
  const [ year, month, day ] = dateKey.split('-').map(Number);

  const naive = Date.UTC(year, month - 1, day, hour, minute);
  const firstGuess = new Date(naive - parisOffsetMs(new Date(naive)));

  return new Date(naive - parisOffsetMs(firstGuess));
};

/** The `YYYY-MM-DD` key of the day after `dateKey`. */
export const nextDateKey = (dateKey: string): string => {
  const [ year, month, day ] = dateKey.split('-').map(Number);

  // Calendar arithmetic on the day key itself, never `+ 24h` on an instant:
  // a DST day is 23 or 25 hours long and would land on the wrong date.
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
};
