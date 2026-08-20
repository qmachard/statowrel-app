import {
  USER_COLLECTION,
  USER_FRIEND_COLLECTION,
  type UserFriendData,
  friendshipDirectionOf,
  userFriendConverter,
} from '@statowrel/models';
import { onSnapshot, orderBy, query } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/auth/AuthContext';
import { getSubCollectionRef } from '@/lib/firestore';

/**
 * The friend list as the Profile screen consumes it (docs/prd.md §5.3), split
 * by what each entry currently is rather than left as one flat list: an
 * accepted friendship and an invitation waiting on somebody are three different
 * lines to read, and only the direction tells which side is waiting.
 */
export interface Friends {
  /** Accepted friendships — the list proper. */
  accepted: UserFriendData[];
  /** Invitations this user received and has not answered yet. */
  incoming: UserFriendData[];
  /** Invitations this user sent, still pending on the other side. */
  outgoing: UserFriendData[];
  /** True until the first snapshot lands — never true again afterwards. */
  loading: boolean;
}

const EMPTY: Friends = { accepted: [], incoming: [], outgoing: [], loading: false };

/**
 * Everything under `v1_users/{uid}/v1_user_friends`, live.
 *
 * **One subscription, one collection read.** Both halves of a friendship are
 * written from the invitation onwards (see `v1_user_friend.ts`), so this list
 * alone carries the invitations received as well as the ones sent — no
 * collection-group query over everybody else's friends, which the rules would
 * refuse anyway (`firestore.rules`: `allow read: if isOwner(user_id)`).
 *
 * Subscribed rather than fetched because the two things that change it happen
 * elsewhere: the callable writing an invitation lands a beat after the sheet
 * closes, and an acceptance comes from the *other* user's device entirely.
 *
 * The handle shown per line is `friend_username`, the copy carried on the
 * entry — that is what makes a list of N friends cost one read instead of N
 * profile reads. Nothing else about the friend is available here, which is why
 * the row shows no streak and no avatar despite §5.3.
 */
export const useFriends = (): Friends => {
  const { user } = useAuth();
  const userId = user?.uid ?? null;

  const [ friendships, setFriendships ] = useState<UserFriendData[] | null>(null);

  useEffect(() => {
    if (userId === null) {
      return undefined;
    }

    // Oldest first: the list is read top to bottom as it was built, and a
    // pending invitation does not jump the queue by being answered.
    const friends = query(
      getSubCollectionRef(USER_COLLECTION, userId, USER_FRIEND_COLLECTION, userFriendConverter),
      orderBy('created_at'),
    );

    return onSnapshot(
      friends,
      (snapshot) => setFriendships(snapshot.docs.map((entry) => entry.data())),
      (error: unknown) => {
        // The rest of the Profile screen stays up: an unreachable friend list
        // renders as an empty one rather than taking the account card with it.
        console.warn('[friends] could not read the friend list', error);
        setFriendships([]);
      },
    );
  }, [ userId ]);

  return useMemo(() => {
    if (friendships === null) {
      return userId === null ? EMPTY : { ...EMPTY, loading: true };
    }

    return {
      accepted: friendships.filter((friendship) => friendship.status === 'accepted'),
      incoming: friendships.filter(
        (friendship) => friendship.status === 'pending' && friendshipDirectionOf(friendship) === 'incoming',
      ),
      outgoing: friendships.filter(
        (friendship) => friendship.status === 'pending' && friendshipDirectionOf(friendship) === 'outgoing',
      ),
      loading: false,
    };
  }, [ friendships, userId ]);
};
