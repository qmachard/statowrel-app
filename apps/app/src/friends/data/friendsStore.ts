import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  USER_COLLECTION,
  USER_FRIEND_COLLECTION,
  type UserFriendData,
  friendshipDirectionOf,
  isFriendshipStatus,
  userFriendConverter,
} from '@statowrel/models';
import { type Unsubscribe, onSnapshot, orderBy, query } from 'firebase/firestore';

import { getSubCollectionRef } from '@/lib/firestore';

/**
 * The friend list as the screens consume it (docs/prd.md §5.3), split by what
 * each entry currently is rather than left as one flat list: an accepted
 * friendship and an invitation waiting on somebody are three different lines to
 * read, and only the direction tells which side is waiting.
 */
export interface Friends {
  /** Accepted friendships — the list proper. */
  accepted: UserFriendData[];
  /** Invitations this user received and has not answered yet. */
  incoming: UserFriendData[];
  /** Invitations this user sent, still pending on the other side. */
  outgoing: UserFriendData[];
  /** True until something is there to show — the stored list, or the first server snapshot. */
  loading: boolean;
}

const EMPTY: Friends = { accepted: [], incoming: [], outgoing: [], loading: false };
const LOADING: Friends = { accepted: [], incoming: [], outgoing: [], loading: true };

const storageKeyOf = (userId: string) => `statowrel.friends.${userId}`;

/**
 * Where the split list this app run holds comes from, and the precedence
 * between the two sources: the stored copy may only fill a list nothing has
 * spoken for yet, never overwrite what the server has said.
 *
 * That is the whole race the disk cache creates — `AsyncStorage` is slow enough
 * to land after a warm listener's first snapshot — and it is settled here
 * rather than by cancelling the read, which would throw away the one case that
 * matters: the listener that never answers.
 */
type Source = 'pending' | 'stored' | 'server';

/** The account everything below describes — `null` before the first watch, and after a sign-out. */
let account: string | null = null;
/** The live listener, `null` when none is open — including after an error, which kills it. */
let unsubscribe: Unsubscribe | null = null;
let source: Source = 'pending';
/**
 * The split list, computed once per snapshot and handed to every consumer by
 * reference — which is what `useSyncExternalStore` requires of a snapshot, and
 * why the split cannot live in `readFriends`.
 */
let friends: Friends = LOADING;

const listeners = new Set<() => void>();

const notify = () => {
  listeners.forEach((listener) => listener());
};

export const subscribeToFriends = (listener: () => void): (() => void) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

/**
 * The friend list for `userId`, or an empty one when nobody is signed in — the
 * same reference for as long as the list has not moved.
 */
export const readFriends = (userId: string | null): Friends => {
  if (userId === null) {
    return EMPTY;
  }

  return account === userId ? friends : LOADING;
};

const split = (friendships: UserFriendData[]): Friends => ({
  accepted: friendships.filter((friendship) => friendship.status === 'accepted'),
  incoming: friendships.filter(
    (friendship) => friendship.status === 'pending' && friendshipDirectionOf(friendship) === 'incoming',
  ),
  outgoing: friendships.filter(
    (friendship) => friendship.status === 'pending' && friendshipDirectionOf(friendship) === 'outgoing',
  ),
  loading: false,
});

/**
 * Whether a stored entry still looks like the list it was written from.
 *
 * Written by this module and read by it alone, so this is not validation of an
 * untrusted payload — it is what keeps a record written by an older version of
 * the model from reaching the screens as a half-empty row.
 */
const isStoredFriendship = (value: unknown): value is UserFriendData => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const entry = value as Record<string, unknown>;

  return typeof entry.user_id === 'string'
    && typeof entry.friend_id === 'string'
    && typeof entry.friend_username === 'string'
    && typeof entry.requested_by === 'string'
    && typeof entry.created_at === 'string'
    && (entry.accepted_at === null || typeof entry.accepted_at === 'string')
    && typeof entry.status === 'string'
    && isFriendshipStatus(entry.status);
};

/**
 * The stored list, or `null` when there is nothing usable — in which case the
 * screens simply wait for the server, which is a beat away.
 *
 * All or nothing on purpose: a list missing the one row a screen was opened for
 * is worse than a spinner, and the two are only ever a beat apart.
 */
const parseStored = (stored: string | null): UserFriendData[] | null => {
  if (stored === null) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(stored);

    if (!Array.isArray(parsed) || !parsed.every(isStoredFriendship)) {
      return null;
    }

    return parsed;
  } catch (error) {
    console.warn('[friends] could not read the stored friend list', error);

    return null;
  }
};

/**
 * Fills the list from disk while the first server snapshot is out.
 *
 * The Firebase JS SDK has no persistence in React Native — `getFirestore(app)`
 * in `src/lib/firebase.ts` leaves the cache in memory only, empty at every
 * launch — so this is the only thing standing between a cold start and a
 * spinner on a list that changes a few times a year.
 *
 * Never rejects, and never wins over the server: an unreadable record leaves
 * the list loading exactly as it was before, and a record landing after the
 * listener has spoken is dropped.
 */
const hydrate = async (userId: string): Promise<void> => {
  const stored = await AsyncStorage.getItem(storageKeyOf(userId)).catch((error: unknown) => {
    console.warn('[friends] could not read the stored friend list', error);

    return null;
  });

  const friendships = parseStored(stored);

  // Another account may have signed in while this read was out — the list
  // belongs to them now, and this one has nothing left to say.
  if (friendships === null || account !== userId || source === 'server') {
    return;
  }

  source = 'stored';
  friends = split(friendships);
  notify();
};

const persist = (userId: string, friendships: UserFriendData[]): void => {
  AsyncStorage.setItem(storageKeyOf(userId), JSON.stringify(friendships)).catch((error: unknown) => {
    // The list is already on screen; a failed write costs the next launch its
    // spinner, and nothing else.
    console.warn('[friends] could not store the friend list', error);
  });
};

const close = (): void => {
  unsubscribe?.();
  unsubscribe = null;
};

/**
 * Everything under `v1_users/{uid}/v1_user_friends`, live — **one subscription
 * for the whole app**, whatever mounts `useFriends`.
 *
 * Both halves of a friendship are written from the invitation onwards (see
 * `v1_user_friend.ts`), so this list alone carries the invitations received as
 * well as the ones sent — no collection-group query over everybody else's
 * friends, which the rules would refuse anyway (`firestore.rules`:
 * `allow read: if isOwner(user_id)`).
 *
 * Subscribed rather than fetched because the two things that change it happen
 * elsewhere: the callable writing an invitation lands a beat after the sheet
 * closes, and an acceptance comes from the *other* user's device entirely.
 *
 * **Held for the session, not for the mount.** The hook is mounted from three
 * places — the Stats screen's invitations, the Menu's list, the day's friend
 * answers — and a listener per mount meant three concurrent subscriptions on
 * the same collection, each billing its own full initial snapshot. There is no
 * reference count here either, for the same reason: a listener closed on the
 * last unmount is re-opened by the next navigation, and re-opening bills that
 * initial snapshot again. So it is closed on the one thing that makes it wrong
 * — the account changing — and on signing out (`clearFriends`).
 */
export const watchFriends = (userId: string): void => {
  if (account !== userId) {
    close();

    account = userId;
    source = 'pending';
    friends = LOADING;
    notify();

    void hydrate(userId);
  }

  // Already live for this account, or being re-opened after the error below
  // killed the previous one — which is the only way a mount ever resubscribes.
  if (unsubscribe !== null) {
    return;
  }

  // Oldest first: the list is read top to bottom as it was built, and a
  // pending invitation does not jump the queue by being answered.
  const collection = query(
    getSubCollectionRef(USER_COLLECTION, userId, USER_FRIEND_COLLECTION, userFriendConverter),
    orderBy('created_at'),
  );

  unsubscribe = onSnapshot(
    collection,
    (snapshot) => {
      const friendships = snapshot.docs.map((entry) => entry.data());

      source = 'server';
      friends = split(friendships);
      notify();

      persist(userId, friendships);
    },
    (error: unknown) => {
      // The rest of the screen stays up: an unreachable friend list renders as
      // an empty one rather than taking the account card with it. What the
      // stored copy holds is left standing when it has already landed, and is
      // still allowed to land afterwards — `source` stays where it is.
      console.warn('[friends] could not read the friend list', error);

      close();

      if (account === userId && source === 'pending') {
        friends = EMPTY;
        notify();
      }
    },
  );
};

/**
 * Drops the subscription and the stored copy — signing out, and deleting the
 * account.
 *
 * The disk cache is keyed per account, so nothing would leak into the next
 * session either way; it is purged because a phone that has been signed out of
 * should not keep a list of who somebody is friends with.
 */
export const clearFriends = async (userId: string | null): Promise<void> => {
  close();

  account = null;
  source = 'pending';
  friends = LOADING;
  notify();

  if (userId === null) {
    return;
  }

  await AsyncStorage.removeItem(storageKeyOf(userId)).catch((error: unknown) => {
    console.warn('[friends] could not drop the stored friend list', error);
  });
};
