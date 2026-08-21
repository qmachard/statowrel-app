import {
  USER_COLLECTION,
  USER_FRIEND_COLLECTION,
  type UserFriendData,
  friendshipDirectionOf,
  userFriendConverter,
} from '@statowrel/models';
import { type Unsubscribe, onSnapshot, orderBy, query } from '@react-native-firebase/firestore';

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
  /** True until the first snapshot lands — the SDK's own disk cache usually answers it. */
  loading: boolean;
}

const EMPTY: Friends = { accepted: [], incoming: [], outgoing: [], loading: false };
const LOADING: Friends = { accepted: [], incoming: [], outgoing: [], loading: true };

/** The account everything below describes — `null` before the first watch, and after a sign-out. */
let account: string | null = null;
/** The live listener, `null` when none is open — including after an error, which kills it. */
let unsubscribe: Unsubscribe | null = null;
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
 * last unmount is re-opened by the next navigation, and the SDK bills that
 * again. So it is closed on the one thing that makes it wrong — the account
 * changing — and on signing out (`clearFriends`).
 *
 * Nothing mirrors the list to `AsyncStorage`: React Native Firebase runs the
 * native SDKs, whose Firestore persistence is on by default and durable across
 * launches, so the first callback below is already served from disk before the
 * server answers. A hand-written copy would only be a second, staler source of
 * the same list — see `docs/firebase-read-optimization.md`.
 */
export const watchFriends = (userId: string): void => {
  if (account !== userId) {
    close();

    account = userId;
    friends = LOADING;
    notify();
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
      friends = split(snapshot.docs.map((entry) => entry.data()));
      notify();
    },
    (error: unknown) => {
      // The rest of the screen stays up: an unreachable friend list renders as
      // an empty one rather than taking the account card with it.
      console.warn('[friends] could not read the friend list', error);

      close();

      if (account === userId) {
        friends = EMPTY;
        notify();
      }
    },
  );
};

/**
 * Drops the subscription — signing out, and deleting the account.
 *
 * A signed-out device has no business holding a listener open on who somebody
 * is friends with, and the next account signing in on this phone must not be
 * shown the previous one's list for a render.
 */
export const clearFriends = (): void => {
  close();

  account = null;
  friends = LOADING;
  notify();
};
