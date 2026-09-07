import { USER_COLLECTION, type UserData, userConverter } from '@statowrel/models';
import { getDoc } from '@react-native-firebase/firestore';
import { useEffect, useMemo, useState } from 'react';

import { getDocumentRef } from '@/lib/firestore';

export interface FriendProfileView {
  status: 'loading' | 'ready' | 'error';
  /** The friend's profile, once it is read. Null while loading and after a failure. */
  profile: UserData | null;
}

/** What one read settled on, tagged with the friend it settled for. */
interface Resolved {
  friendId: string;
  status: 'ready' | 'error';
  profile: UserData | null;
}

/**
 * A friend's own profile — their streak, their record, their answered days
 * (docs/prd.md §5.3, §4.6).
 *
 * `v1_users` is readable by any signed-in user (`firestore.rules`), which is
 * what a friend list of pseudos and avatars needs; the counters ride along on
 * the same document, so a friend's streak costs the one read and nothing is
 * denormalized onto the friendship for it. Which is deliberate:
 * `v1_user_friend.ts` says why a streak is the one thing not copied there — it
 * moves every day and would be stale on sight.
 *
 * **Fetched, not subscribed.** The screen is transient and the counters move
 * once a day at the other end; a listener would hold a socket open on somebody
 * else's document for the length of a glance.
 *
 * The result carries the UID it is about rather than being cleared when that
 * UID changes: resetting state at the top of an effect is a synchronous
 * `setState` in an effect body, which this app treats as an error (see
 * `apps/app/CLAUDE.md`). « Loading » is derived from a result that is not this
 * friend's, exactly as `useDailyQuestion` derives its own.
 */
export const useFriendProfile = (friendId: string): FriendProfileView => {
  const [ resolved, setResolved ] = useState<Resolved | null>(null);

  useEffect(() => {
    // The screen can be left while the read is in flight — a friend profile is
    // one back gesture deep — and a `setState` after that is a warning and a leak.
    let alive = true;

    getDoc(getDocumentRef(USER_COLLECTION, friendId, userConverter))
      .then((snapshot) => {
        if (!alive) {
          return;
        }

        const profile = snapshot.data();

        setResolved(profile === undefined
          ? { friendId, status: 'error', profile: null }
          : { friendId, status: 'ready', profile });
      })
      .catch((error: unknown) => {
        console.warn('[friends] could not read the friend profile', error);

        if (alive) {
          setResolved({ friendId, status: 'error', profile: null });
        }
      });

    return () => {
      alive = false;
    };
  }, [ friendId ]);

  return useMemo(() => (
    resolved === null || resolved.friendId !== friendId
      ? { status: 'loading', profile: null }
      : { status: resolved.status, profile: resolved.profile }
  ), [ friendId, resolved ]);
};
