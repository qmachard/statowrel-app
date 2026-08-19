import {
  FRIEND_SUBCOLLECTION,
  USER_COLLECTION,
  friendConverter,
  userConverter,
} from '@statowrel/models';
import { deleteDoc, getDoc, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { getDocumentRef, getSubCollectionRef, getSubDocumentRef } from '@/lib/firestore';

export interface Friend {
  /** The friend's UID — the friendship document id. */
  id: string;
  displayName: string;
  photoUrl: string | null;
}

interface FriendsState {
  friends: Friend[];
  loading: boolean;
  removeFriend: (friendId: string) => Promise<void>;
}

/** Last resolved list, tagged with the uid it belongs to. */
interface FriendsSnapshot {
  uid: string | null;
  friends: Friend[];
}

const EMPTY_FRIENDS: Friend[] = [];

/**
 * The signed-in user's friends, oldest first, each resolved against its
 * `v1_users` profile so pseudo and avatar are always the current ones (the
 * friendship document denormalises nothing).
 *
 * `removeFriend` only drops the caller's own side of the friendship: the
 * mirrored entry is the backend's to delete, and that flow ships with the
 * invitation feature (docs/prd.md §4.1).
 */
export const useFriends = (uid: string | null): FriendsState => {
  // Same shape as useUserProfile — the uid tag is what makes an account switch
  // read as "loading" during render instead of through an effect.
  const [ snapshot, setSnapshot ] = useState<FriendsSnapshot>({ uid: null, friends: EMPTY_FRIENDS });

  const userRef = useMemo(
    () => (uid ? getDocumentRef(USER_COLLECTION, uid, userConverter) : null),
    [uid],
  );

  useEffect(() => {
    if (!userRef || !uid) return;

    const friendsRef = getSubCollectionRef(userRef, FRIEND_SUBCOLLECTION, friendConverter);

    let cancelled = false;

    const unsubscribe = onSnapshot(query(friendsRef, orderBy('created_at')), async (documents) => {
      const friends = await Promise.all(documents.docs.map(async (friend): Promise<Friend> => {
        const profile = (await getDoc(getDocumentRef(USER_COLLECTION, friend.id, userConverter))).data();

        return {
          id: friend.id,
          displayName: profile?.display_name ?? '',
          photoUrl: profile?.photo_url ?? null,
        };
      }));

      if (cancelled) return;

      setSnapshot({ uid, friends });
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [ userRef, uid ]);

  const removeFriend = useCallback(async (friendId: string) => {
    if (!userRef) return;

    await deleteDoc(getSubDocumentRef(userRef, FRIEND_SUBCOLLECTION, friendId, friendConverter));
  }, [userRef]);

  const isFresh = uid !== null && snapshot.uid === uid;

  return {
    friends: isFresh ? snapshot.friends : EMPTY_FRIENDS,
    loading: uid !== null && !isFresh,
    removeFriend,
  };
};
