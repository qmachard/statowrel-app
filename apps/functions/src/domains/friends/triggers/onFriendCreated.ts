import { logger } from 'firebase-functions/v2';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { USER_COLLECTION, USER_FRIEND_COLLECTION, userFriendConverter } from '@statowrel/models';

import { REGION_CLOUD, parseSnapshotData } from '@/libs/firebase-admin';

import { onFriendshipCreated } from './steps/onFriendshipCreated';

/**
 * Fires on every half of every friendship, as it is created — docs/prd.md §4.1.
 *
 * `onDocumentCreated` and not `onDocumentWritten`: an invitation is *created*
 * pending and only ever updated to `accepted` afterwards, and the acceptance is
 * a state the invitee is already looking at. What deserves a notification is
 * the arrival, which is a creation.
 *
 * The domain still resolves the handle in a callable — a username nobody holds
 * produces no write to fire on — but once the pair *is* written, the push is a
 * trigger's job: it must not make the invitation sheet wait on Expo, and its
 * failure must not fail an invitation that has already landed.
 */
export const onFriendCreated = onDocumentCreated({
  region: REGION_CLOUD,
  document: `${USER_COLLECTION}/{user_id}/${USER_FRIEND_COLLECTION}/{friend_id}`,
}, async (event) => {
  if (event.data === undefined) {
    logger.error('Friendship created event without a document', { params: event.params });

    return;
  }

  await onFriendshipCreated(parseSnapshotData(event.data, userFriendConverter));
});
