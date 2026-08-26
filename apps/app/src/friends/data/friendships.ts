import { USER_COLLECTION, USER_FRIEND_COLLECTION, userFriendConverter } from '@statowrel/models';
import { Timestamp, writeBatch } from '@react-native-firebase/firestore';

import { db } from '@/lib/firebase';
import { getSubDocumentRef } from '@/lib/firestore';

/**
 * The two halves of one friendship — `v1_users/{a}/v1_user_friends/{b}` and its
 * mirror. Both are always written together: a pair that agrees on one side and
 * not the other is a friendship one of the two cannot see.
 */
const halvesOf = (userId: string, friendId: string) => [
  getSubDocumentRef(USER_COLLECTION, userId, USER_FRIEND_COLLECTION, friendId, userFriendConverter),
  getSubDocumentRef(USER_COLLECTION, friendId, USER_FRIEND_COLLECTION, userId, userFriendConverter),
];

/**
 * Accepts an invitation (docs/prd.md §4.1), moving both halves from `pending`
 * to `accepted` in one batch.
 *
 * Written by the app rather than by a callable, unlike the invitation: there is
 * nothing to resolve here — both documents already exist, and `firestore.rules`
 * carries the whole rule (`pending` → `accepted` only, never by whoever sent
 * the invitation, `created_at` untouched).
 *
 * `Timestamp.now()` and not an ISO string: a converter's `toFirestore` is not
 * invoked by `update()`, so the value written is exactly the one passed.
 */
export const acceptFriendship = async (userId: string, friendId: string): Promise<void> => {
  const batch = writeBatch(db);
  const acceptedAt = Timestamp.now();

  for (const half of halvesOf(userId, friendId)) {
    batch.update(half, { status: 'accepted', accepted_at: acceptedAt });
  }

  await batch.commit();
};

/**
 * Refusing an invitation, cancelling one's own and removing a friend are the
 * same operation: both halves are deleted, from either side of the pair
 * (docs/prd.md §4.1 — the friendship disappears on both sides).
 *
 * Nothing is left behind on purpose, so a refused invitation never shows the
 * sender a « declined » state and inviting again later starts over.
 */
export const removeFriendship = async (userId: string, friendId: string): Promise<void> => {
  const batch = writeBatch(db);

  for (const half of halvesOf(userId, friendId)) {
    batch.delete(half);
  }

  await batch.commit();
};
