import { parisTimeToInstant } from './parisTime';

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
