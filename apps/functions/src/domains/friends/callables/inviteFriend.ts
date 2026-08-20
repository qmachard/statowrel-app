import { HttpsError, onCall } from 'firebase-functions/v2/https';
import {
  type InviteFriendOutcome,
  type InviteFriendResult,
  USER_COLLECTION,
  USERNAME_COLLECTION,
  USER_FRIEND_COLLECTION,
  type UserFriendData,
  isValidUsername,
  normalizeUsername,
  userConverter,
  userFriendConverter,
  usernameConverter,
} from '@statowrel/models';
import { z } from 'zod';

import {
  REGION_CLOUD,
  createWriteBatch,
  getDocumentRef,
  getSubDocumentRef,
  parseData,
} from '@/libs/firebase-admin';

const payloadSchema = z.object({
  username: z.string(),
});

/**
 * Sends a friend invitation to the holder of an exact handle — docs/prd.md
 * §4.1, where adding a friend by typing their username is one of the three ways
 * in, and the only one implemented.
 *
 * **A callable rather than a trigger**, and rather than a client-side write.
 * The screen asks a question — "does this handle exist?" — and a Firestore
 * trigger fires *after* a write, so it has nothing to answer with and nothing
 * to fire on when the handle is unknown. The rules would in fact let the app
 * resolve the handle and write both halves itself (`v1_usernames` is `get`-able
 * and `v1_user_friends` is writable from either side of the pair), but that
 * spreads the invariants below — no self-invite, no second invitation over an
 * existing pair — across a client nobody can hold to them.
 *
 * The whole pair is written here, both halves in one batch, `pending` from the
 * moment it is sent: that is what puts the invitation in the invitee's own list
 * without a collection-group query (see `v1_user_friend.ts`).
 */
export const inviteFriend = onCall<unknown, Promise<InviteFriendResult>>(
  { region: REGION_CLOUD },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in to invite a friend.');
    }

    const payload = payloadSchema.safeParse(request.data);

    if (!payload.success) {
      throw new HttpsError('invalid-argument', 'A username is required.');
    }

    // Normalized before it is validated, not after: a handle is compared,
    // stored and looked up in one single form, so `Lou` is a valid way of
    // typing `lou` rather than a malformed handle.
    const username = normalizeUsername(payload.data.username);

    if (!isValidUsername(username)) {
      throw new HttpsError('invalid-argument', 'That is not a valid username.');
    }

    const userId = request.auth.uid;

    // The reservation is the authority on who holds a handle (docs/prd.md
    // §4.1): no document, no account — there is no directory to search and no
    // approximate match to fall back on.
    const reservation = await getDocumentRef(USERNAME_COLLECTION, username, usernameConverter)
      .get()
      .then(parseData);

    if (reservation === null) {
      throw new HttpsError('not-found', 'No account holds that username.');
    }

    const friendId = reservation.user_id;

    if (friendId === userId) {
      throw new HttpsError('failed-precondition', 'That username is your own.');
    }

    const [ inviter, friend ] = await Promise.all([
      getDocumentRef(USER_COLLECTION, userId, userConverter).get().then(parseData),
      getDocumentRef(USER_COLLECTION, friendId, userConverter).get().then(parseData),
    ]);

    // The mirror carries the *other* side's handle, so both profiles are read:
    // the invitee's entry has to introduce the inviter by name. A reservation
    // whose profile is gone is a half-deleted account, not an invitable one.
    if (inviter === null || friend === null) {
      throw new HttpsError('not-found', 'No account holds that username.');
    }

    const ownRef = getSubDocumentRef(
      getDocumentRef(USER_COLLECTION, userId, userConverter),
      USER_FRIEND_COLLECTION,
      friendId,
      userFriendConverter,
    );

    // At most one friendship per pair is a property of the path — the document
    // id is the other user's UID — so this read is the whole duplicate check,
    // with no query to run.
    const existing = await ownRef.get().then(parseData);

    if (existing !== null) {
      const outcome: InviteFriendOutcome = existing.status === 'accepted' ? 'already_friends' : 'already_invited';

      // Deliberately the same outcome whichever side sent the pending
      // invitation: re-sending one that is already waiting is a no-op, and an
      // invitation *received* is answered from the friend list, not from here.
      return { outcome, username };
    }

    const friendRef = getSubDocumentRef(
      getDocumentRef(USER_COLLECTION, friendId, userConverter),
      USER_FRIEND_COLLECTION,
      userId,
      userFriendConverter,
    );

    const createdAt = new Date().toISOString();

    const half = (ownerId: string, otherId: string, otherUsername: string): UserFriendData => ({
      user_id: ownerId,
      friend_id: otherId,
      friend_username: otherUsername,
      status: 'pending',
      // The same value on both halves — the direction is read from it rather
      // than stored per side, so the two mirrors cannot disagree on who
      // invited whom.
      requested_by: userId,
      created_at: createdAt,
      accepted_at: null,
    });

    const batch = createWriteBatch();

    batch.set(ownRef, half(userId, friendId, friend.username));
    batch.set(friendRef, half(friendId, userId, inviter.username));

    await batch.commit();

    return { outcome: 'invited', username };
  },
);
