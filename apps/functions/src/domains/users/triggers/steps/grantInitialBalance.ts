import { Timestamp, type UpdateData } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import {
  INITIAL_STATFLOUZZ_BALANCE,
  USER_COLLECTION,
  type UserData,
  type UserFirebaseData,
  userConverter,
} from '@statowrel/models';

import { getDocumentRef, runTransaction } from '@/libs/firebase-admin';

/**
 * Grants the opening StatFlouzz to a profile whose client created it empty —
 * docs/prd.md §4.7.
 *
 * **Why the client cannot be trusted to do it alone.** The 1.1.0 app writes
 * `statcoin_balance: 0` at create, and `firestore.rules` still accepts that
 * opening so those installs can complete onboarding without a store update
 * (see `startsWithInitialBalance()` there). This step is what makes the new
 * behaviour real for those clients: it reads the just-created profile, and if
 * the wallet has not moved from its truly-empty shape (`statcoin_balance == 0`
 * *and* `statcoins_earned == 0` *and* `statcoins_spent == 0`), it credits the
 * opening balance server-side.
 *
 * **Idempotency, without a marker.** A create trigger is delivered at least
 * once. The three-field check *is* the marker: after the first credit,
 * `statcoin_balance` is 50 and the guard trips. The wallet is closed to the
 * client afterwards (`keepsWallet()`), so nothing else moves those fields in
 * this window; the only writer that could is the answer trigger, which cannot
 * credit before the profile carries a streak — and a fresh profile carries
 * none. Read-then-write in a transaction seals the race regardless.
 *
 * **What is deliberately skipped.** A client that already opened the profile at
 * `INITIAL_STATFLOUZZ_BALANCE` (post-1.1.0) needs no top-up: the guard reads
 * `50` and returns. Same for any profile whose wallet has ever moved — the
 * step is a rollout bridge, not a scheduled grant.
 */
export const grantInitialBalance = async (userId: string, user: UserData): Promise<void> => {
  if (user.statcoin_balance !== 0 || user.statcoins_earned !== 0 || user.statcoins_spent !== 0) {
    return;
  }

  const userRef = getDocumentRef(USER_COLLECTION, userId, userConverter);

  await runTransaction(async (transaction) => {
    const current = (await transaction.get(userRef)).data();

    if (current === undefined) {
      logger.warn('User document vanished before initial balance could be granted', { user_id: userId });

      return;
    }

    if (current.statcoin_balance !== 0 || current.statcoins_earned !== 0 || current.statcoins_spent !== 0) {
      return;
    }

    // update() does not run the converter (see the repo's CLAUDE.md), so
    // `updated_at` is a Timestamp here rather than an ISO string.
    const wallet: UpdateData<UserFirebaseData> = {
      statcoin_balance: INITIAL_STATFLOUZZ_BALANCE,
      updated_at: Timestamp.now(),
    };

    transaction.update(userRef, wallet);

    logger.info('Initial StatFlouzz balance granted', {
      user_id: userId,
      statflouzz: INITIAL_STATFLOUZZ_BALANCE,
    });
  });
};
