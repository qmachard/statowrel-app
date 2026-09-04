import { logger } from 'firebase-functions/v2';
import {
  USER_COLLECTION,
  USER_REFERRAL_COLLECTION,
  type UserData,
  type UserReferralData,
  userConverter,
  userReferralConverter,
} from '@statowrel/models';

import { createFriendshipPair } from '@/domains/friends/helpers/createFriendshipPair';
import { getDocumentRef, getSubDocumentRef, parseData } from '@/libs/firebase-admin';

/**
 * Opens the referral a brand-new profile arrived with — docs/prd.md §4.9.
 *
 * The newcomer typed a handle on the username sheet; the app resolved it and
 * wrote `referred_by` on the profile it was creating, which `firestore.rules`
 * accepts at `create` and freezes from then on. This step is what that field
 * *does*, and it does two things, neither of which pays anything yet:
 *
 * 1. **It puts the newcomer on the sponsor's list**, `rewarded_at: null`. The
 *    payout waits for a first answer, which can be days away, and a sponsor who
 *    brought three friends in and reads « 0 filleul » all week concludes the
 *    attribution is broken. A row that says « en attente » is the answer to
 *    "did it work" — see `v1_user_referral.ts`.
 * 2. **It sends the sponsor a friend invitation on the newcomer's behalf**,
 *    `pending`, with the newcomer as `requested_by`. Somebody who arrived
 *    through a link should not have to go and find the person who sent it, and
 *    `friends-onFriendCreated` then pushes the invitation the ordinary way —
 *    which is also how the sponsor first learns a name: « @lou veut devenir ton
 *    pote. » An invitation and not an accepted friendship: the sponsor gets to
 *    decide, and an accepted pair written from here would notify nobody.
 *
 * **A refusal costs nothing.** The payout below never reads the friendship, so
 * a sponsor who declines still earns, and a newcomer who is declined still gets
 * their bonus. Refusing is a statement about wanting somebody in one's friend
 * list, not about whether they really came from a link — and hanging money on
 * an invitation the sponsor may simply never open would strand every referral
 * whose sponsor is inactive.
 *
 * **Idempotent**: a create trigger is delivered at least once. The row is read
 * before it is written, so a redelivery after the payout cannot reset
 * `rewarded_at` to null; the friendship helper reads its own pair for the same
 * reason.
 */
export const recordReferral = async (userId: string, user: UserData): Promise<void> => {
  const sponsorId = user.referred_by;

  // Truthiness rather than `=== null`: `ModelData` widens every nullable field
  // to `T | null | undefined`, so only this narrows it to a string.
  if (!sponsorId || sponsorId === userId) {
    return;
  }

  const sponsorRef = getDocumentRef(USER_COLLECTION, sponsorId, userConverter);
  const sponsor = await sponsorRef.get().then(parseData);

  // The rules checked this profile existed when the newcomer wrote
  // `referred_by`, so reaching here means the sponsor deleted their account in
  // between. Nothing to open, and nothing to fix later: the payout step reaches
  // the same conclusion on its own and settles the referral without a sponsor.
  if (sponsor === null) {
    logger.warn('Referral names a sponsor whose profile is gone', { user_id: userId, sponsor_id: sponsorId });

    return;
  }

  const rowRef = getSubDocumentRef(sponsorRef, USER_REFERRAL_COLLECTION, userId, userReferralConverter);
  const existing = await rowRef.get().then(parseData);

  if (existing === null) {
    const row: UserReferralData = {
      user_id: sponsorId,
      referred_user_id: userId,
      referred_username: user.username,
      // Nothing is owed until the newcomer has answered once — see
      // `referrals/triggers/steps/payReferralReward.ts`.
      statcoins_earned: 0,
      created_at: new Date().toISOString(),
      rewarded_at: null,
    };

    await rowRef.set(row);
  }

  const outcome = await createFriendshipPair({
    requesterId: userId,
    requesterUsername: user.username,
    friendId: sponsorId,
    friendUsername: sponsor.username,
  });

  logger.info('Referral opened', {
    user_id: userId,
    sponsor_id: sponsorId,
    friendship: outcome,
  });
};
