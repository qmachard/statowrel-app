import {
  INVITE_FRIEND_CALLABLE,
  type InviteFriendPayload,
  type InviteFriendResult,
} from '@statowrel/models';

import { callFunction } from '@/lib/functions';

/**
 * Sends a friend invitation to the holder of an exact handle (docs/prd.md
 * §4.1), through the `friends-inviteFriend` callable.
 *
 * The app writes nothing itself here, unlike every other write it makes: the
 * handle has to be resolved before anything exists to write, and both halves of
 * the friendship land in one batch backend-side. See the callable for why it is
 * not a trigger — an unknown handle produces no write for one to fire on.
 *
 * Throws a `FirebaseError` carrying a `functions/*` code; translate it with
 * `inviteFailure` rather than surfacing it.
 */
export const inviteFriend = (username: string): Promise<InviteFriendResult> => (
  callFunction<InviteFriendPayload, InviteFriendResult>(INVITE_FRIEND_CALLABLE, { username })
);
