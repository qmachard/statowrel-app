/**
 * Wire contracts of the callable Cloud Functions — the one module here that
 * describes no Firestore collection.
 *
 * It lives in `@statowrel/models` because it is the only package both
 * `apps/app` and `apps/functions` depend on, and because a callable's payload
 * has exactly the problem a converter has: two sides serialising the same
 * shape, and no compiler between them unless the shape is written down once.
 *
 * Field names stay `snake_case` like everywhere else, even though nothing here
 * is stored — the app should not have to remember which casing a given hop
 * uses.
 */

/**
 * Name `httpsCallable()` is given on the client, and the name Firebase deploys
 * the function under: the top-level `index.ts` re-exports each domain as a
 * namespace (`export * as friends from './domains/friends'`), which is what
 * turns `friends.inviteFriend` into `friends-inviteFriend`.
 */
export const INVITE_FRIEND_CALLABLE = 'friends-inviteFriend';

export interface InviteFriendPayload {
  /** The friend's exact handle, as typed. Normalized backend-side — a handle only exists in one form. */
  username: string;
}

/**
 * What sending an invitation ended up doing. Everything that is *not* an
 * outcome — an unknown handle, one's own handle, a malformed one — comes back
 * as an `HttpsError` instead, since none of them wrote anything.
 *
 * `already_invited` and `already_friends` are outcomes rather than errors: the
 * pair already exists, so the invitation is a no-op and the app has something
 * true to say about it. Which side sent the pending invitation is deliberately
 * not distinguished — see `inviteFriend` on why.
 */
export const INVITE_FRIEND_OUTCOMES = [ 'invited', 'already_invited', 'already_friends' ] as const;

export type InviteFriendOutcome = (typeof INVITE_FRIEND_OUTCOMES)[number];

export interface InviteFriendResult {
  outcome: InviteFriendOutcome;
  /** The handle the invitation actually landed on, normalized — what the app echoes back. */
  username: string;
}

/**
 * Deleting one's own account (docs/prd.md §4.1, required by both stores).
 *
 * A callable rather than a client-side write: `firestore.rules` denies deleting
 * a profile, a username reservation and an answer to everyone, on purpose —
 * freeing a handle and dropping the *other* half of every friendship are writes
 * no client can be trusted with, and there is no delete a rule could scope to
 * "everything this account owns" in one go.
 */
export const DELETE_ACCOUNT_CALLABLE = 'users-deleteAccount';

/**
 * Nothing to hand back but the confirmation: the account is gone, and the app's
 * only next move is to sign out. It is a shape rather than `void` so the
 * callable keeps a contract to compile against, like the one above.
 */
export interface DeleteAccountResult {
  outcome: 'deleted';
}
