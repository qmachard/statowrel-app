import { FirebaseError } from 'firebase/app';

/**
 * Thrown when no `v1_usernames` reservation matches the handle — raised by the
 * client-side lookup that spares the callable a call it would answer with
 * `functions/not-found` anyway (see `data/inviteFriend.ts`).
 */
export class FriendNotFoundError extends Error {
  constructor(username: string) {
    super(`No account holds @${username}`);
    this.name = 'FriendNotFoundError';
  }
}

/**
 * Where a failed invitation has to be shown: `field` when the answer that has
 * to change is the handle itself, `form` when it is the connection.
 *
 * Same split as the onboarding sheet's — a taken handle sits under the input, a
 * failed write above the button.
 */
export interface InviteFailure {
  scope: 'field' | 'form';
  message: string;
}

const NOT_FOUND: InviteFailure = { scope: 'field', message: 'Utilisateur introuvable.' };

/**
 * `functions/*` codes the callable raises on purpose — see
 * `apps/functions/src/domains/friends/callables/inviteFriend.ts`. Anything else
 * is a transport failure and falls back below.
 */
const FAILURES: Record<string, InviteFailure> = {
  'functions/not-found': NOT_FOUND,
  'functions/invalid-argument': NOT_FOUND,
  'functions/failed-precondition': { scope: 'field', message: 'C\'est ton propre nom d\'utilisateur.' },
  'functions/unauthenticated': { scope: 'form', message: 'Reconnecte-toi pour inviter un pote.' },
};

const FALLBACK: InviteFailure = {
  scope: 'form',
  message: 'L\'invitation n\'est pas partie. Vérifie ta connexion et réessaie.',
};

/**
 * Never returns a raw `functions/*` code — the code goes to the console
 * instead, the way `src/auth/errors.ts` handles `auth/*`.
 *
 * An unknown handle and a malformed one land on the same sentence on purpose:
 * there is no public search (docs/prd.md §4.1), so from the user's side both
 * mean « personne ne s'appelle comme ça ».
 */
export const inviteFailure = (error: unknown): InviteFailure => {
  // The client-side lookup got there first — same sentence as the callable's
  // own `functions/not-found`, and nothing to log: an unknown handle is a
  // normal outcome of this screen, not a failure.
  if (error instanceof FriendNotFoundError) {
    return NOT_FOUND;
  }

  if (error instanceof FirebaseError) {
    console.warn(`[friends] invitation failed with ${error.code}`, error.message);

    return FAILURES[error.code] ?? FALLBACK;
  }

  console.warn('[friends] invitation failed', error);

  return FALLBACK;
};
