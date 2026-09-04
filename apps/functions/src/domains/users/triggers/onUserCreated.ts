import { logger } from 'firebase-functions/v2';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { USER_COLLECTION, userConverter } from '@statowrel/models';

import { REGION_CLOUD, parseSnapshotData } from '@/libs/firebase-admin';

import { grantInitialBalance } from './steps/grantInitialBalance';
import { recordReferral } from './steps/recordReferral';

/**
 * Fires on every profile creation — the server-side half of docs/prd.md §4.7.
 *
 * **Why this trigger exists at all.** `firestore.rules` now accepts a profile
 * opened at `0` *or* at `INITIAL_STATFLOUZZ_BALANCE` on `create`: the 1.1.0 app
 * shipped `statcoin_balance: 0`, and refusing that would lock every ≤1.1.0
 * install out of onboarding until they update — which is not something we can
 * force. This trigger closes the tolerance by levelling every fresh profile up
 * to the opening balance server-side, so both the new client (which writes 50
 * itself) and every deployed client (which writes 0) end up with the same
 * wallet a moment after sign-up.
 *
 * It is also where a referral opens (docs/prd.md §4.9): a profile created
 * carrying `referred_by` puts its author on the sponsor's list and sends that
 * sponsor a friend invitation. Nothing is paid here — the payout waits for the
 * newcomer's first answer, in the `referrals` domain.
 *
 * Both steps are idempotent by design — see each one. They run in order rather
 * than in parallel, and the wallet goes first: a referral that throws replays
 * the whole trigger, and a grant that has already landed must not be able to
 * land twice on the retry.
 */
export const onUserCreated = onDocumentCreated({
  region: REGION_CLOUD,
  document: `${USER_COLLECTION}/{user_id}`,
}, async (event) => {
  if (event.data === undefined) {
    logger.error('User created event without a document', { params: event.params });

    return;
  }

  const user = parseSnapshotData(event.data, userConverter);

  await grantInitialBalance(event.data.id, user);
  await recordReferral(event.data.id, user);
});
