import { streakStatflouzzReward } from '@statowrel/models';
import { useEffect, useSyncExternalStore } from 'react';

import { useAuth } from '@/auth/AuthContext';
import {
  disarmMilestoneWatch,
  getMilestoneWatchesVersion,
  readMilestoneWatch,
  subscribeToMilestoneWatches,
} from '@/daily-question/data/milestoneStore';

export interface StreakMilestone {
  /** The streak the answer just reached — 10, 20, 30… */
  streak: number;
  /** The StatFlouzz the account was credited for reaching it. */
  reward: number;
}

/**
 * The milestone this session just crossed on `date`, or `null` — docs/prd.md
 * §4.6 and §4.7.
 *
 * **It announces a payout, so it only ever speaks once the payout is on the
 * profile.** The reward is credited server-side, by the answer trigger, in the
 * transaction that moves the streak — the app writes the answer and learns
 * nothing back from that write. What it does have is the `v1_users/{uid}`
 * subscription `AuthContext` already holds, which carries the new streak and
 * the new wallet a beat later; and `milestoneStore`, which froze both numbers
 * the instant before the answer was written. The celebration is the difference
 * between the two, and nothing else:
 *
 * - `streakStatflouzzReward` — the very helper the trigger pays from — says
 *   what crossing from the frozen streak to the current one is worth. Zero for
 *   a streak that did not move, which is exactly a **late catch-up answer**:
 *   the trigger leaves the streak alone there, so there is no crossing and
 *   nothing to celebrate.
 * - `statcoins_earned` must have moved by **at least** that much. That is the
 *   proof half: the lifetime trace is only ever credited by a payout, so a
 *   milestone the trigger has not paid yet — or one it decided differently —
 *   simply does not show. It errs late rather than early, which is the only
 *   safe direction for a number the account is told it owns.
 *
 * The two conditions also make the referral welcome bonus (§4.9, +10 on a
 * newcomer's first answer) harmless: it moves `statcoins_earned` without
 * crossing anything, so the reward it is measured against is zero.
 *
 * **A joker celebrates the same way.** It advances the streak like an on-time
 * answer and earns the milestone it crosses (§4.8), and the reward rides the
 * same trigger — so the two numbers move exactly as they do for an answer, with
 * no StatOwrel anywhere in the reasoning.
 *
 * Derived rather than stored: nothing is set from an effect, so the card
 * appears on the snapshot that carries the credit and on no render before it.
 * The one effect here is the **disarm on the way out** — the celebration
 * belongs to the moment the milestone is crossed, so leaving the sheet ends it,
 * and reopening the day from the calendar finds no watch to speak of.
 */
export const useStreakMilestone = (date: string): StreakMilestone | null => {
  const { user, profile } = useAuth();
  const userId = user?.uid ?? null;

  useSyncExternalStore(subscribeToMilestoneWatches, getMilestoneWatchesVersion);
  const watch = readMilestoneWatch(userId, date);

  useEffect(() => {
    if (userId === null) {
      return undefined;
    }

    return () => {
      disarmMilestoneWatch(userId, date);
    };
  }, [ userId, date ]);

  if (watch === null || profile === null) {
    return null;
  }

  const reward = streakStatflouzzReward(watch.streakBefore, profile.streak_count);

  if (reward <= 0 || profile.statcoins_earned - watch.earnedBefore < reward) {
    return null;
  }

  return { streak: profile.streak_count, reward };
};
