/**
 * The app's currency — earned by answering, spent on asking.
 *
 * Like `callables.ts`, this module describes no Firestore collection: it is the
 * rule itself, written down once because three sides need to agree on it — the
 * answer trigger that credits, the callable that debits, and the screen that
 * tells the user what they can afford. A constant duplicated across those three
 * is a constant that drifts, and a currency that drifts is a bug people notice.
 *
 * The wallet lives on the profile (`v1_users`: `statcoin_balance`, `statcoins_earned`,
 * `statcoins_spent`), maintained by the backend alone — `firestore.rules` denies
 * the client every write that moves it.
 *
 * **Why 100 and not 1.** One streak milestone could just as well have handed
 * over a single coin worth one question. It hands over a hundred so the unit
 * stays smaller than the price: a pack bought in-app, a reward for watching an
 * ad, a gift between friends — none of those are worth a whole question, and
 * none of them can exist if the smallest coin *is* a question. Neither the pack
 * nor the ad is implemented; the divisibility that lets them exist is.
 */

/**
 * The streak that pays out — every tenth consecutive day answered on time
 * (10, 20, 30…), and only on the day the milestone is crossed.
 *
 * A milestone rather than a per-day drip because the reward has to be an event:
 * ten StatCoins a day would fund a question just as fast and celebrate nothing.
 */
export const STREAK_STATCOIN_MILESTONE = 10;

/** What crossing a milestone pays. */
export const STREAK_STATCOIN_REWARD = 100;

/** What proposing a question costs (docs/prd.md §4.7) — one milestone, exactly. */
export const QUESTION_STATCOIN_COST = 100;

/**
 * What a day's answer pays out, from the streak before it and the streak after.
 *
 * Derived from the *crossing* rather than from the new value alone: a streak
 * that did not move pays nothing, which is what a late catch-up answer does
 * (it never reaches here) and what a redelivered write would do (it would).
 * Comparing the two milestone counts is also what keeps the rule honest if the
 * streak ever advances by more than one — the reward follows the ground
 * covered, not the digit it landed on.
 */
export const streakStatcoinReward = (previousStreak: number, nextStreak: number): number => {
  if (nextStreak <= previousStreak) {
    return 0;
  }

  // Never negative past the guard above: a bigger streak can only sit in the
  // same milestone bracket or a later one.
  const crossed = Math.floor(nextStreak / STREAK_STATCOIN_MILESTONE)
    - Math.floor(previousStreak / STREAK_STATCOIN_MILESTONE);

  return crossed * STREAK_STATCOIN_REWARD;
};
