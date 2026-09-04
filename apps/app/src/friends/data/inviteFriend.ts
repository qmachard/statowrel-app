import {
  INVITE_FRIEND_CALLABLE,
  type InviteFriendPayload,
  type InviteFriendResult,
  USERNAME_COLLECTION,
  usernameConverter,
} from '@statowrel/models';
import { getDoc } from '@react-native-firebase/firestore';

import { track } from '@/analytics/analytics';
import type { FriendInviteOutcome } from '@/analytics/events';
import { FriendNotFoundError } from '@/friends/errors';
import { firebaseErrorCode } from '@/lib/firebaseError';
import { getDocumentRef } from '@/lib/firestore';
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
 * **The reservation is read first, and the callable only runs if it exists.**
 * `v1_usernames` is `get`-able by any signed-in user — that is precisely how a
 * handle resolves to an account (docs/prd.md §4.1) — so the most likely outcome
 * of this screen, a typo, costs one document read instead of a function
 * invocation and its cold start. It is a shortcut, **not** the check: the
 * callable resolves the handle again server-side, because a client's word on
 * who exists is worth nothing.
 *
 * Throws `FriendNotFoundError` for a handle nobody holds, and otherwise a
 * `FirebaseError` carrying a `functions/*` code; translate both with
 * `inviteFailure` rather than surfacing them.
 */
/**
 * Maps every failure the callable is known to raise onto one of the six
 * `friend_invited` outcomes, so the analytics funnel splits by cause rather
 * than reading « an invitation failed » — enough to see whether the friend
 * feature converts, and where it does not.
 */
const outcomeOfError = (error: unknown): FriendInviteOutcome => {
  const code = firebaseErrorCode(error);

  if (error instanceof FriendNotFoundError) return 'not_found';
  if (code === 'functions/not-found') return 'not_found';
  if (code === 'functions/already-exists') return 'already_friends';
  if (code === 'functions/failed-precondition') return 'pending';
  if (code === 'functions/permission-denied') return 'blocked';

  return 'error';
};

export const inviteFriend = async (username: string): Promise<InviteFriendResult> => {
  try {
    const reservation = await getDoc(getDocumentRef(USERNAME_COLLECTION, username, usernameConverter));

    if (!reservation.exists()) {
      throw new FriendNotFoundError(username);
    }

    const result = await callFunction<InviteFriendPayload, InviteFriendResult>(INVITE_FRIEND_CALLABLE, { username });

    track({ name: 'friend_invited', params: { outcome: 'sent' } });

    return result;
  } catch (error) {
    track({ name: 'friend_invited', params: { outcome: outcomeOfError(error) } });

    throw error;
  }
};
