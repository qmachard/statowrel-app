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

/**
 * Proposing a question, paid for in StatCoins (docs/prd.md §4.7).
 *
 * **A callable, and the only door left.** `firestore.rules` used to let an
 * author write their own `pending` question straight into `v1_questions`, which
 * was fine while a proposal was free and is not any more: a price nothing
 * collects is not a price. So `v1_questions` is now `allow create: if false`
 * for every client, and this is where the debit and the write happen together —
 * one transaction, so a question cannot exist without having been paid for and
 * a wallet cannot be emptied without a question coming out of it.
 *
 * Named after the namespace `apps/functions/src/index.ts` re-exports the domain
 * under, like `INVITE_FRIEND_CALLABLE` above.
 */
export const PROPOSE_QUESTION_CALLABLE = 'questions-proposeQuestion';

/**
 * One option of a proposed question — its two labels and nothing else.
 *
 * No `id`: an option's ULID is minted backend-side, alongside the question's
 * own. It is what a recorded answer points at (`v1_question.ts`), so it is not
 * a thing a client gets to choose.
 */
export interface ProposeQuestionOptionPayload {
  /** Shown as the option — e.g. « Par le bout ». */
  label: string;
  /**
   * The StatOwrel it earns — e.g. « méthodique », rendered « tu es un.e
   * méthodique ». **Optional**: an empty string is a question posed without
   * one, and every reader falls back to `label` through `statLabelOf`.
   */
  stat_label: string;
}

export interface ProposeQuestionPayload {
  /** The question itself, at most `QUESTION_LABEL_MAX_LENGTH` characters. */
  label: string;
  /** Between `QUESTION_MIN_OPTIONS` and `QUESTION_MAX_OPTIONS` options, in display order. */
  options: ProposeQuestionOptionPayload[];
}

/**
 * What the proposal left behind. Everything that is *not* one — an empty
 * wallet, a malformed question, a profile that does not exist — comes back as
 * an `HttpsError`, since none of them wrote anything and none of them debited
 * anything.
 */
export interface ProposeQuestionResult {
  /** The question's own id, `pending` in the moderation pot from this moment. */
  question_id: string;
  /**
   * The wallet as the debit left it.
   *
   * Handed back rather than left to the profile snapshot the app already holds:
   * the screen has to say what the question just cost the moment it says the
   * question is in, and a subscription lands when it lands.
   */
  statcoin_balance: number;
}
