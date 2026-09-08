import { COMPATIBILITY_MIN_COMMON_DAYS, type FriendCompatibilityResult } from '@statowrel/models';

import { COMPATIBILITY_VERDICTS } from '@/friends/copy';

/**
 * What the card shows — the three states a score can be in, resolved once so
 * the component renders one of them instead of re-deciding mid-JSX.
 */
export type CompatibilityView =
  | { kind: 'score'; score: number; verdict: string }
  | { kind: 'too-soon'; missing: number }
  | { kind: 'empty' };

/** The band a score falls in. The list is ordered high to low, so the first match is the right one. */
const verdictOf = (score: number): string => (
  COMPATIBILITY_VERDICTS.find((band) => score >= band.from)?.label ?? ''
);

/**
 * A score is only worth showing once there are enough days behind it —
 * `COMPATIBILITY_MIN_COMMON_DAYS` (docs/prd.md §5.3). One shared day answered
 * the same way is 100 %, which is a coincidence wearing a statistic's clothes.
 *
 * Below that the card says how many days are still missing, and says something
 * else again when there is not one: « encore 4 jours » reads as progress, and a
 * pair who have never answered the same day have not started.
 */
export const compatibilityView = (compatibility: FriendCompatibilityResult): CompatibilityView => {
  if (compatibility.common_days === 0) {
    return { kind: 'empty' };
  }

  if (compatibility.common_days < COMPATIBILITY_MIN_COMMON_DAYS) {
    return { kind: 'too-soon', missing: COMPATIBILITY_MIN_COMMON_DAYS - compatibility.common_days };
  }

  return {
    kind: 'score',
    score: compatibility.score,
    verdict: verdictOf(compatibility.score),
  };
};
