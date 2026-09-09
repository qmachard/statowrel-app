/**
 * What the wallet and the streak looked like the instant this session wrote an
 * answer — the « avant » a milestone celebration is decided against
 * (docs/prd.md §4.6, §4.7).
 *
 * The milestone reward is paid by the answer trigger, server-side, in the very
 * transaction that moves the streak: the app writes the answer, the trigger
 * credits `statcoin_balance` / `statcoins_earned` and bumps `streak_count` a
 * beat later, and `AuthContext`'s subscription on `v1_users/{uid}` is what
 * carries both back. So the app has nothing to *compute* and everything to
 * *observe* — but observing a profile that already carries the reward says
 * nothing on its own: a streak of 10 read at the door is a streak of 10 whether
 * it was crossed a second ago or yesterday.
 *
 * Hence the watch. Armed the instant before the write, it freezes the two
 * numbers the payout moves; the hook then celebrates only what the profile
 * proves moved since (`useStreakMilestone`). That is the whole anti-promise
 * rule of the feature: **nothing is announced that the account has not been
 * credited**, and the app never predicts the server's decision.
 *
 * Armed *before* the write rather than after, deliberately: the emulator runs
 * the answer trigger in milliseconds, so a watch armed on the write's own
 * resolution would freeze a profile the reward had already landed on — and
 * would then find nothing to celebrate, on the one setup this feature is
 * verified from.
 *
 * A session-lifetime map like `answerStore` and `jokerStore`, and disarmed by
 * the sheet on its way out: the celebration belongs to the moment the milestone
 * is crossed, so reopening the day from the calendar — a fresh mount, an empty
 * store — never replays it.
 */
export interface MilestoneWatch {
  /** `streak_count` as the profile carried it before the answer was written. */
  streakBefore: number;
  /** `statcoins_earned` at that same instant — the lifetime trace the payout moves. */
  earnedBefore: number;
}

const watches = new Map<string, MilestoneWatch>();
const listeners = new Set<() => void>();
// Bumped on every arm and every disarm, so a consumer can subscribe through
// `useSyncExternalStore` without a snapshot it has to keep identical.
let version = 0;

const keyOf = (userId: string, date: string) => `${userId}:${date}`;

const notify = () => {
  version += 1;
  listeners.forEach((listener) => listener());
};

/**
 * Freezes what the payout will move, for the day about to be answered.
 *
 * Re-arming the same day is a no-op rather than a refresh: the first watch is
 * the one taken before the write, and replacing it with a profile the trigger
 * may already have moved is exactly the mistake arming early avoids.
 */
export const armMilestoneWatch = (userId: string, date: string, watch: MilestoneWatch): void => {
  const key = keyOf(userId, date);

  if (watches.has(key)) {
    return;
  }

  watches.set(key, watch);
  notify();
};

/** Drops the watch — the celebration has had its moment. */
export const disarmMilestoneWatch = (userId: string, date: string): void => {
  if (watches.delete(keyOf(userId, date))) {
    notify();
  }
};

export const subscribeToMilestoneWatches = (listener: () => void): (() => void) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

/** How many times a watch was armed or dropped — the snapshot `useSyncExternalStore` reads. */
export const getMilestoneWatchesVersion = (): number => version;

/**
 * The watch armed for that day, or `null` — the same reference for as long as
 * it is stored, which is what `useSyncExternalStore` needs from a snapshot.
 */
export const readMilestoneWatch = (userId: string | null, date: string): MilestoneWatch | null => (
  userId === null ? null : watches.get(keyOf(userId, date)) ?? null
);
