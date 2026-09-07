import {
  FRIEND_COMPATIBILITY_CALLABLE,
  type FriendCompatibilityPayload,
  type FriendCompatibilityResult,
  dailyQuestionDateKey,
} from '@statowrel/models';
import { useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/auth/AuthContext';
import { readCompatibility, writeCompatibility } from '@/friends/data/compatibilityCache';
import { callFunction } from '@/lib/functions';

export interface FriendCompatibilityView {
  status: 'loading' | 'ready' | 'error';
  /** The three numbers, once they are known. Null while loading and after a failure. */
  compatibility: FriendCompatibilityResult | null;
}

/** What one resolution settled on, tagged with the friend it settled for. */
interface Resolved {
  friendId: string;
  status: 'ready' | 'error';
  compatibility: FriendCompatibilityResult | null;
}

/**
 * How alike a friend answered — docs/prd.md §5.3.
 *
 * **Through the callable and nowhere else.** The comparison needs both
 * histories, and `firestore.rules` scopes the answers' collection group to
 * one's own: a friend's answer is readable one question at a time, so reading a
 * day never becomes reading a history. Which also means this number cannot be
 * subscribed to — there is no document the client may watch — and does not need
 * to be: it moves once a day at most.
 *
 * **One call per friend per day**, and that is the whole caching story. The
 * device answers from `compatibilityCache` while the stored score carries
 * today's day key; the callable answers from its own document while that
 * document does; only the first opening of a profile after both have gone stale
 * actually recomputes anything.
 *
 * The result carries the UID it is about, for the same reason
 * `useFriendProfile`'s does — see that hook.
 */
export const useFriendCompatibility = (friendId: string): FriendCompatibilityView => {
  const { user } = useAuth();
  const userId = user?.uid ?? null;

  const [ resolved, setResolved ] = useState<Resolved | null>(null);

  useEffect(() => {
    if (userId === null) {
      return undefined;
    }

    let alive = true;

    const resolve = async () => {
      const today = dailyQuestionDateKey(new Date());
      const cached = await readCompatibility(userId, friendId, today);

      if (cached !== null) {
        if (alive) {
          setResolved({ friendId, status: 'ready', compatibility: cached });
        }

        return;
      }

      const compatibility = await callFunction<FriendCompatibilityPayload, FriendCompatibilityResult>(
        FRIEND_COMPATIBILITY_CALLABLE,
        { friend_id: friendId },
      );

      await writeCompatibility(userId, friendId, compatibility);

      if (alive) {
        setResolved({ friendId, status: 'ready', compatibility });
      }
    };

    resolve().catch((error: unknown) => {
      // Nothing to translate into a sentence of its own: the card says the score
      // is unavailable, and the rest of the screen — the handle, the streak —
      // stands without it.
      console.warn('[friends] could not read the compatibility', error);

      if (alive) {
        setResolved({ friendId, status: 'error', compatibility: null });
      }
    });

    return () => {
      alive = false;
    };
  }, [ friendId, userId ]);

  return useMemo(() => (
    resolved === null || resolved.friendId !== friendId
      ? { status: 'loading', compatibility: null }
      : { status: resolved.status, compatibility: resolved.compatibility }
  ), [ friendId, resolved ]);
};
