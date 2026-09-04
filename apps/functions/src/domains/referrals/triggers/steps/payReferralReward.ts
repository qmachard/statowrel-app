import { FieldValue, Timestamp, type UpdateData } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import {
  FRIEND_INVITE_CHANNEL_ID,
  REFERRAL_MAX_REWARDED,
  REFERRAL_STATFLOUZZ_REWARD,
  REFERRAL_WELCOME_STATFLOUZZ_BONUS,
  USER_COLLECTION,
  USER_REFERRAL_COLLECTION,
  type UserFirebaseData,
  type UserReferralData,
  type UserReferralFirebaseData,
  userConverter,
  userReferralConverter,
} from '@statowrel/models';

import { sendPushToUser } from '@/domains/notifications';
import { getDocumentRef, getSubDocumentRef, parseData, runTransaction } from '@/libs/firebase-admin';

/** What the transaction settled, so the notifications below know what to say. */
interface SettledReferral {
  sponsorId: string;
  sponsorUsername: string | null;
  newcomerUsername: string;
  /** What the sponsor was actually credited — zero when they are gone or past their cap. */
  reward: number;
}

/**
 * Pays a referral out, once, on the newcomer's first real answer — docs/prd.md
 * §4.9.
 *
 * **Why the first answer and not the sign-up.** An address costs nothing to
 * invent, so a payout on a created account is a payout for a created account. A
 * day answered is the smallest thing a real user does, and the smallest thing a
 * farm will not do at scale for twenty StatFlouzz across two wallets — less
 * than one joker.
 *
 * **Why the demo answer is not it.** The onboarding carousel's question is
 * answered before there is an account, and `useDemoAnswerFlush` writes that
 * pick into `v1_questions/{DEMO_QUESTION_ID}/v1_daily_question_answers/{uid}`
 * the first moment a session exists — the same path a real answer takes. For a
 * referred account it is almost always the *first* document in that collection
 * group, so a trigger that did not exclude it would pay at sign-up while
 * believing it was paying at engagement. The trigger drops it on the question
 * id, before this step is reached and before anything is read.
 *
 * A joker counts, and so does a catch-up answer. Neither is worth screening
 * out: a joker costs `JOKER_STATFLOUZZ_COST` (20) to earn 10, so buying one to
 * trip this is a loss, and a late answer is a real day answered late.
 *
 * **Idempotency.** `referral_rewarded_at` on the newcomer's own profile is the
 * marker, read inside the transaction that stamps it — the same shape
 * `refunded_at` guards a refund with, and for the same reason: this is money,
 * and a trigger is delivered at least once. It is stamped even when nothing can
 * be credited, so a settled-but-worthless referral is not retried forever. The
 * two cases where that happens are a sponsor whose account is gone (the rules
 * checked they existed when `referred_by` was written; deleting afterwards is
 * always possible) and a sponsor already at `REFERRAL_MAX_REWARDED`.
 *
 * The friendship the sponsor was sent at sign-up is deliberately not read: a
 * declined or ignored invitation does not withhold the money — see
 * `users/triggers/steps/recordReferral.ts`.
 */
export const payReferralReward = async (userId: string): Promise<void> => {
  const userRef = getDocumentRef(USER_COLLECTION, userId, userConverter);
  const user = await userRef.get().then(parseData);

  // The common case by far, and it costs one read: almost nobody answering
  // today arrived through a referral, and nobody settles twice.
  // Truthiness rather than `=== null`: `ModelData` widens every nullable field
  // to `T | null | undefined`, so only this narrows `referred_by` to a string.
  if (user === null || !user.referred_by || user.referral_rewarded_at) {
    return;
  }

  const sponsorId = user.referred_by;
  const sponsorRef = getDocumentRef(USER_COLLECTION, sponsorId, userConverter);
  const rowRef = getSubDocumentRef(sponsorRef, USER_REFERRAL_COLLECTION, userId, userReferralConverter);

  const settled = await runTransaction<SettledReferral | null>(async (transaction) => {
    // Every read before every write — a Firestore transaction refuses the
    // other order outright.
    const [ currentSnap, sponsorSnap, rowSnap ] = await Promise.all([
      transaction.get(userRef),
      transaction.get(sponsorRef),
      transaction.get(rowRef),
    ]);

    const current = currentSnap.data();

    if (current === undefined || !current.referred_by || current.referral_rewarded_at) {
      return null;
    }

    const sponsor = sponsorSnap.data();
    const now = Timestamp.now();

    // The newcomer's side settles whatever happens to the sponsor's: they typed
    // a handle that was valid when they typed it, and what became of that
    // account afterwards is not theirs to pay for.
    const newcomerWallet: UpdateData<UserFirebaseData> = {
      statcoin_balance: FieldValue.increment(REFERRAL_WELCOME_STATFLOUZZ_BONUS),
      statcoins_earned: FieldValue.increment(REFERRAL_WELCOME_STATFLOUZZ_BONUS),
      referral_rewarded_at: now,
      updated_at: now,
    };

    transaction.update(userRef, newcomerWallet);

    if (sponsor === undefined) {
      logger.warn('Referral settled without a sponsor to credit', { user_id: userId, sponsor_id: sponsorId });

      return { sponsorId, sponsorUsername: null, newcomerUsername: current.username, reward: 0 };
    }

    const reward = sponsor.referrals_count >= REFERRAL_MAX_REWARDED ? 0 : REFERRAL_STATFLOUZZ_REWARD;

    if (reward > 0) {
      const sponsorWallet: UpdateData<UserFirebaseData> = {
        statcoin_balance: FieldValue.increment(reward),
        statcoins_earned: FieldValue.increment(reward),
        referrals_count: FieldValue.increment(1),
        updated_at: now,
      };

      transaction.update(sponsorRef, sponsorWallet);
    }

    if (rowSnap.exists) {
      // `update()` does not run the converter (see the repo's CLAUDE.md), so
      // the stamp goes in as a Timestamp rather than an ISO string.
      const settlement: UpdateData<UserReferralFirebaseData> = {
        statcoins_earned: reward,
        rewarded_at: now,
      };

      transaction.update(rowRef, settlement);
    } else {
      // The row is written at sign-up by `users-onUserCreated`. Reaching here
      // means that trigger never landed — its own retries exhausted, or the
      // sponsor's profile briefly unreadable — and the referral is settling
      // anyway. Writing it now is what keeps the sponsor's list complete;
      // `created_at` is the best value left, the sign-up itself being gone.
      const row: UserReferralData = {
        user_id: sponsorId,
        referred_user_id: userId,
        referred_username: current.username,
        statcoins_earned: reward,
        created_at: current.created_at,
        rewarded_at: now.toDate().toISOString(),
      };

      transaction.set(rowRef, row);
    }

    return { sponsorId, sponsorUsername: sponsor.username, newcomerUsername: current.username, reward };
  });

  if (settled === null) {
    return;
  }

  logger.info('Referral rewarded', {
    user_id: userId,
    sponsor_id: settled.sponsorId,
    sponsor_reward: settled.reward,
    newcomer_bonus: REFERRAL_WELCOME_STATFLOUZZ_BONUS,
  });

  // Both sides are told, and that is the point rather than a courtesy: this
  // repo narrates every move of the currency (a rejected question says its
  // refund in so many words), and a wallet that grows by ten with no sentence
  // attached is the one thing a currency cannot afford. The sponsor learns
  // *who* — which is the whole answer to "how do I know that one came from me"
  // — and the newcomer learns *why* their balance moved.
  await Promise.all([
    settled.reward > 0
      ? sendPushToUser(settled.sponsorId, {
        title: 'Un pote t’a rejoint',
        body: `@${settled.newcomerUsername} a rejoint StatOwrel grâce à toi. +${settled.reward}§ pour toi.`,
        channelId: FRIEND_INVITE_CHANNEL_ID,
        data: { type: 'referral_joined' },
      })
      : Promise.resolve(null),
    settled.sponsorUsername === null
      ? Promise.resolve(null)
      : sendPushToUser(userId, {
        title: `+${REFERRAL_WELCOME_STATFLOUZZ_BONUS}§ pour toi`,
        body: `Tu es arrivé.e sur StatOwrel grâce à @${settled.sponsorUsername}.`,
        channelId: FRIEND_INVITE_CHANNEL_ID,
        data: { type: 'referral_joined' },
      }),
  ]);
};
