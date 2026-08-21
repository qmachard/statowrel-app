import { useEffect, useSyncExternalStore } from 'react';

import { useAuth } from '@/auth/AuthContext';
import { readFriends, subscribeToFriends, watchFriends } from '@/friends/data/friendsStore';

export type { Friends } from '@/friends/data/friendsStore';

/**
 * The signed-in account's friendships, live — accepted, received and sent.
 *
 * A thin read over `friendsStore`, which holds the one subscription the whole
 * app shares: this hook is mounted from the Stats screen, the Menu and the
 * day's sheet at once, and the store is what keeps that from being three
 * listeners on the same collection. Everything it reports — the split, the
 * ordering, the empty list an unreachable collection renders as — is that
 * store's; see it for the why of each.
 */
export const useFriends = () => {
  const { user } = useAuth();
  const userId = user?.uid ?? null;

  useEffect(() => {
    if (userId !== null) {
      watchFriends(userId);
    }
  }, [ userId ]);

  return useSyncExternalStore(subscribeToFriends, () => readFriends(userId));
};
