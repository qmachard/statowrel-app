import {
  USER_COLLECTION,
  USER_FRIEND_COLLECTION,
  type UserFriendData,
  userConverter,
  userFriendConverter,
} from '@statowrel/models';

import {
  createWriteBatch,
  getDocumentRef,
  getSubDocumentRef,
  parseData,
} from '@/libs/firebase-admin';

/**
 * What writing a pair ended up doing — the same three values
 * `INVITE_FRIEND_OUTCOMES` carries, since the invitation callable is what
 * hands them to the app.
 */
export type FriendshipPairOutcome = 'invited' | 'already_invited' | 'already_friends';

export interface FriendshipPairInput {
  /** Whoever is sending the invitation — lands in `requested_by` on both halves. */
  requesterId: string;
  requesterUsername: string;
  friendId: string;
  friendUsername: string;
}

/**
 * Writes the two mirrored halves of one friendship, `pending`, in a single
 * batch — docs/prd.md §4.1.
 *
 * Extracted from `inviteFriend` because a second caller appeared: a profile
 * created naming a sponsor sends that sponsor an invitation on the newcomer's
 * behalf (`users/triggers/steps/inviteSponsor.ts`, docs/prd.md §4.9). The
 * invariant those two share is not "send an invitation", it is **the shape of a
 * pair** — same `requested_by` on both sides, each half carrying the other's
 * handle, one document per side keyed by the other's UID — and an invariant
 * written twice is an invariant that drifts.
 *
 * At most one friendship per pair is a property of the path (the document id is
 * the other user's UID), so the single read below is the whole duplicate check:
 * there is no query to run, and no race a transaction would close that the path
 * does not close already.
 *
 * Neither caller resolves handles here: both already hold two profiles, and
 * this function is deliberately incapable of inventing one.
 */
export const createFriendshipPair = async ({
  requesterId,
  requesterUsername,
  friendId,
  friendUsername,
}: FriendshipPairInput): Promise<FriendshipPairOutcome> => {
  const ownRef = getSubDocumentRef(
    getDocumentRef(USER_COLLECTION, requesterId, userConverter),
    USER_FRIEND_COLLECTION,
    friendId,
    userFriendConverter,
  );

  const existing = await ownRef.get().then(parseData);

  if (existing !== null) {
    return existing.status === 'accepted' ? 'already_friends' : 'already_invited';
  }

  const friendRef = getSubDocumentRef(
    getDocumentRef(USER_COLLECTION, friendId, userConverter),
    USER_FRIEND_COLLECTION,
    requesterId,
    userFriendConverter,
  );

  const createdAt = new Date().toISOString();

  const half = (ownerId: string, otherId: string, otherUsername: string): UserFriendData => ({
    user_id: ownerId,
    friend_id: otherId,
    friend_username: otherUsername,
    status: 'pending',
    // The same value on both halves — the direction is read from it rather
    // than stored per side, so the two mirrors cannot disagree on who invited
    // whom.
    requested_by: requesterId,
    created_at: createdAt,
    accepted_at: null,
  });

  const batch = createWriteBatch();

  batch.set(ownRef, half(requesterId, friendId, friendUsername));
  batch.set(friendRef, half(friendId, requesterId, requesterUsername));

  await batch.commit();

  return 'invited';
};
