import { parisTimeToInstant } from './parisTime';

/** The daily question drops at a random time between 08:00 and 20:00 Paris — docs/prd.md §4.2. */
export const PUBLICATION_WINDOW_START_HOUR = 8;
export const PUBLICATION_WINDOW_END_HOUR = 20;

/**
 * Picks the instant a day's question drops: a uniformly random minute inside the
 * publication window, in Europe/Paris.
 *
 * Randomness is the product decision, not an implementation detail — the app
 * shows no countdown precisely because the drop time is unpredictable
 * (docs/prd.md §5.2).
 */
export const pickPublishedAt = (dateKey: string): Date => {
  const windowMinutes = (PUBLICATION_WINDOW_END_HOUR - PUBLICATION_WINDOW_START_HOUR) * 60;

  return parisTimeToInstant(
    dateKey,
    PUBLICATION_WINDOW_START_HOUR,
    Math.floor(Math.random() * windowMinutes),
  );
};

/**
 * Paris midnight closing a day — past it an answer no longer counts for the
 * streak and is flagged `late` (docs/prd.md §4.6).
 */
export const closingTimeOf = (dateKey: string): Date => parisTimeToInstant(dateKey, 24);
