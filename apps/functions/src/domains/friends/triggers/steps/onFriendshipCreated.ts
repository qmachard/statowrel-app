import { logger } from 'firebase-functions/v2';
import {
  FRIEND_INVITE_CHANNEL_ID,
  type UserFriendData,
  friendshipDirectionOf,
} from '@statowrel/models';

import { sendPushToUser } from '@/domains/notifications';

const NOTIFICATION_TITLE = 'Nouvelle invitation';

/**
 * Tells somebody they have just been invited — docs/prd.md §4.1, the other end
 * of the handle typed in the invitation sheet.
 *
 * A friendship is two documents (`v1_user_friend.ts`), and this runs on both:
 * only the **received** half notifies, which is the whole recipient logic —
 * the half sitting in the inviter's own list is `outgoing`, and nobody needs a
 * banner for what they just did themselves. An `accepted` creation cannot come
 * from `inviteFriend`, but a re-import or a fixture could, and neither is an
 * invitation to announce.
 *
 * The invitation itself is already in Firestore when this runs — the friend
 * list is a live snapshot — so a push that fails, or that lands on an account
 * with no device, costs the banner and nothing else. Hence no retry beyond the
 * trigger's own: the invitation is waiting on the Menu screen either way.
 */
export const onFriendshipCreated = async (friendship: UserFriendData): Promise<void> => {
  if (friendship.status !== 'pending' || friendshipDirectionOf(friendship) !== 'incoming') {
    return;
  }

  const report = await sendPushToUser(friendship.user_id, {
    title: NOTIFICATION_TITLE,
    // The inviter's handle: this half of the pair carries it, so introducing
    // them costs no profile read.
    body: `@${friendship.friend_username} veut devenir ton pote.`,
    channelId: FRIEND_INVITE_CHANNEL_ID,
    // Nothing more to route on than the kind: the app opens the Menu, where the
    // invitation is already listed with its « Accepter » / « Refuser ».
    data: { type: 'friend_invite' },
  });

  logger.info('Friend invitation notified', {
    user_id: friendship.user_id,
    friend_id: friendship.friend_id,
    ...report,
  });
};
