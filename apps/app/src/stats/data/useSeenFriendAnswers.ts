import { useEffect, useSyncExternalStore } from 'react';

import { useAuth } from '@/auth/AuthContext';
import {
  type SeenFriendAnswers,
  loadSeenFriendAnswers,
  readSeenFriendAnswers,
  subscribeToSeenFriendAnswers,
} from '@/stats/data/seenFriendAnswers';

/**
 * How many friends' answers this device has already shown per day, or `null`
 * while the record is still being read off `AsyncStorage`.
 *
 * `null` is what keeps the calendar from flashing a badge on every day of the
 * month for the frame before the record lands — the caller reads it as « no
 * badge yet » rather than as « nothing seen ».
 *
 * A store rather than state, for the same reason the calendar cache is one: it
 * moves from the question sheet, which is not the Stats screen's own render.
 */
export const useSeenFriendAnswers = (): SeenFriendAnswers | null => {
  const { user } = useAuth();
  const userId = user?.uid ?? null;

  useEffect(() => {
    if (userId !== null) {
      loadSeenFriendAnswers(userId);
    }
  }, [ userId ]);

  return useSyncExternalStore(
    subscribeToSeenFriendAnswers,
    () => readSeenFriendAnswers(userId),
  );
};
