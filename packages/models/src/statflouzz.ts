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
 * ten StatFlouzz a day would fund a question just as fast and celebrate nothing.
 */
export const STREAK_STATFLOUZZ_MILESTONE = 10;

/** What crossing a milestone pays. */
export const STREAK_STATFLOUZZ_REWARD = 100;

/** What proposing a question costs (docs/prd.md §4.7) — one milestone, exactly. */
export const QUESTION_STATFLOUZZ_COST = 100;

/**
 * What skipping today's question with a joker costs (docs/prd.md §4.8).
 *
 * Two fifths of a streak reward on purpose: a joker has to be affordable often
 * enough to keep a series through a bad week, and expensive enough that the
 * currency does not devalue the streak it exists to protect. Priced under the
 * proposal, since a joker preserves a series while a question is what starts
 * one.
 */
export const JOKER_STATFLOUZZ_COST = 20;

/**
 * The wallet a fresh account opens with — docs/prd.md §4.7.
 *
 * A single joker's worth of coins over what a joker costs: enough to try one
 * before the first streak milestone pays, without covering a proposal that has
 * to be earned. `firestore.rules`' `startsWithInitialBalance()` pins this exact
 * value on every profile creation, so changing this number is a rules change
 * too — a create that seeds anything else is refused.
 */
export const INITIAL_STATFLOUZZ_BALANCE = 50;

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
export const streakStatflouzzReward = (previousStreak: number, nextStreak: number): number => {
  if (nextStreak <= previousStreak) {
    return 0;
  }

  // Never negative past the guard above: a bigger streak can only sit in the
  // same milestone bracket or a later one.
  const crossed = Math.floor(nextStreak / STREAK_STATFLOUZZ_MILESTONE)
    - Math.floor(previousStreak / STREAK_STATFLOUZZ_MILESTONE);

  return crossed * STREAK_STATFLOUZZ_REWARD;
};

/**
 * What bringing somebody new pays — docs/prd.md §4.9.
 *
 * **Paid to both sides, and paid late.** The sponsor gets
 * `REFERRAL_STATFLOUZZ_REWARD`, the newcomer `REFERRAL_WELCOME_STATFLOUZZ_BONUS`
 * on top of their opening balance, and neither is credited at sign-up: the
 * payout waits for the newcomer's **first answer**. An address costs nothing to
 * invent, so paying on a created account is paying for a created account; a day
 * answered is the smallest thing a real user does and a fake one will not.
 *
 * Two-sided because a one-sided referral asks the newcomer to finish an
 * onboarding for somebody else's benefit. Ten each is deliberately modest —
 * a fifth of a question, half a joker — so the currency is not diluted by a
 * mechanic that scales with a contact list.
 */
export const REFERRAL_STATFLOUZZ_REWARD = 10;

/** What the newcomer gets, on top of `INITIAL_STATFLOUZZ_BALANCE`, once they have answered once. */
export const REFERRAL_WELCOME_STATFLOUZZ_BONUS = 10;

/**
 * How many referrals one account is ever paid for.
 *
 * Not a fraud model, a ceiling. What makes farming unprofitable is the price of
 * one fake referral — an address, an onboarding and a real day answered — set
 * against what it yields, twenty StatFlouzz across two accounts, which is less
 * than one joker. This is what keeps the total *bounded* anyway: an unbounded
 * faucet is a currency design bug even while nobody is exploiting it.
 *
 * Twenty, so a sponsor's lifetime referral income tops out at two questions'
 * worth. Raising it is one constant; it is set low deliberately, since a
 * ceiling that has never been reached costs nothing and one that has been
 * reached by a farm cannot be lowered retroactively.
 *
 * Past the cap the newcomer still collects their welcome bonus: they did
 * nothing wrong, and the cap is the sponsor's.
 */
export const REFERRAL_MAX_REWARDED = 20;
