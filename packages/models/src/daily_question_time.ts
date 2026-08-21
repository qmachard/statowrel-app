import { DAILY_QUESTION_TIME_ZONE, dateKeyParts } from './v1_daily_question_month';

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
  const [ year, monthIndex, day ] = dateKeyParts(dateKey);

  const naive = Date.UTC(year, monthIndex, day, hour, minute);
  const firstGuess = new Date(naive - parisOffsetMs(new Date(naive)));

  return new Date(naive - parisOffsetMs(firstGuess));
};

/** The daily question drops at 07:00 Paris, the same hour for everyone — docs/prd.md §4.2. */
export const PUBLICATION_HOUR = 7;

/**
 * The instant a day's question drops: 07:00 Europe/Paris, every day.
 *
 * Derived from the day key rather than read off the clock so a retried
 * scheduler run recomputes the exact same value, and so a run delayed by a
 * few seconds still stamps the round hour it was meant to publish at.
 */
export const publicationTimeOf = (dateKey: string): Date => (
  parisTimeToInstant(dateKey, PUBLICATION_HOUR)
);

/**
 * Paris midnight closing a day — past it an answer no longer counts for the
 * streak and is flagged `late` (docs/prd.md §4.6).
 */
export const closingTimeOf = (dateKey: string): Date => parisTimeToInstant(dateKey, 24);

/**
 * The daily nudge goes out at 18:00 Paris — late enough that a good part of the
 * friends have answered and the count is worth reading, early enough to leave
 * the whole evening to answer before the day closes at midnight.
 */
export const FRIENDS_ANSWERS_HOUR = 18;
