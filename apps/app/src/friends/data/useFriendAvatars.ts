import { USER_COLLECTION, userConverter } from '@statowrel/models';
import { getDoc } from '@react-native-firebase/firestore';
import { useEffect, useState } from 'react';

import { getDocumentRef } from '@/lib/firestore';

/**
 * The friend's picture, per UID — `null` for a friend who has none, and absent
 * from the map while their profile is still being read.
 */
export type FriendAvatars = Record<string, string | null>;

/**
 * Read once per session, and shared by every mount: a picture does not move,
 * and reopening the Profile screen must not re-read the same profiles.
 */
const cache = new Map<string, string | null>();
/** UIDs whose read is already in flight, so a re-render does not fire it twice. */
const pending = new Map<string, Promise<void>>();

const readAvatar = (userId: string): Promise<void> => {
  const existing = pending.get(userId);

  if (existing !== undefined) {
    return existing;
  }

  const read = getDoc(getDocumentRef(USER_COLLECTION, userId, userConverter))
    .then((snapshot) => {
      cache.set(userId, snapshot.data()?.photo_url ?? null);
    })
    .catch((error: unknown) => {
      // The row keeps the avatar generated from the handle, which is what it
      // shows while the read is in flight anyway — nothing to recover from.
      console.warn('[friends] could not read a friend avatar', userId, error);
      cache.set(userId, null);
    })
    .finally(() => {
      pending.delete(userId);
    });

  pending.set(userId, read);

  return read;
};

/**
 * The pictures of a friend list, fetched from the friends' own profiles.
 *
 * A friendship entry carries the handle and nothing else — deliberately, since
 * a copied picture would be stale and the rules can only vouch for the handle
 * (`v1_user_friend.ts`). The picture therefore costs one profile read per
 * friend, which is exactly what `firestore.rules` opens `v1_users` to any
 * signed-in user for.
 *
 * Read once rather than subscribed, and cached for the session: a friend list
 * is short, a picture changes about never, and a missing one falls back to the
 * avatar generated from the handle (`src/lib/avatars.ts`) rather than to
 * nothing.
 */
export const useFriendAvatars = (userIds: string[]): FriendAvatars => {
  const [ avatars, setAvatars ] = useState<FriendAvatars>(() => Object.fromEntries(cache));
  const key = userIds.join(',');

  useEffect(() => {
    const missing = userIds.filter((userId) => !cache.has(userId));

    if (missing.length === 0) {
      return undefined;
    }

    let cancelled = false;

    Promise.all(missing.map(readAvatar)).then(() => {
      if (!cancelled) {
        setAvatars(Object.fromEntries(cache));
      }
    });

    return () => {
      cancelled = true;
    };
    // `key` is the list itself, joined — a re-render that hands over the same
    // UIDs in the same order must not restart the reads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ key ]);

  return avatars;
};
