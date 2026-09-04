import { isFirebaseError } from '@/lib/firebaseError';

/** Thrown when the user backs out of a native sign-in sheet — never surfaced as an error. */
export class SignInCancelledError extends Error {
  constructor() {
    super('Sign-in cancelled by the user');
    this.name = 'SignInCancelledError';
  }
}

/** Thrown when a provider is not configured in this build (missing env / platform). */
export class SignInUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SignInUnavailableError';
  }
}

/** Thrown when a username is already held by another account (docs/prd.md §4.1). */
export class UsernameTakenError extends Error {
  constructor() {
    super('Username already taken');
    this.name = 'UsernameTakenError';
  }
}

/**
 * Thrown when the handle typed under « Qui t'a fait venir ? » belongs to
 * nobody (docs/prd.md §4.9).
 *
 * It has to be its own failure rather than a silently dropped attribution: a
 * typo would otherwise cost the sponsor their 10§ without either side ever
 * finding out, and there is no second chance — `referred_by` is written at
 * profile creation and frozen from then on.
 */
export class ReferrerNotFoundError extends Error {
  constructor(readonly username: string) {
    super(`No account holds @${username}`);
    this.name = 'ReferrerNotFoundError';
  }
}

/** Which door the user came through — the same Firebase code means different things per provider. */
export type SignInMethod = 'password' | 'google' | 'apple';

const METHOD_LABELS: Record<SignInMethod, string> = {
  password: 'e-mail',
  google: 'Google',
  apple: 'Apple',
};

const FIREBASE_MESSAGES: Record<string, string> = {
  'auth/invalid-email': 'Cette adresse e-mail n\'est pas valide.',
  'auth/user-disabled': 'Ce compte a été désactivé.',
  'auth/user-not-found': 'Aucun compte ne correspond à cette adresse.',
  'auth/email-already-in-use': 'Un compte existe déjà avec cette adresse.',
  'auth/weak-password': 'Ce mot de passe est trop court.',
  'auth/too-many-requests': 'Trop de tentatives. Réessaie dans quelques minutes.',
  'auth/network-request-failed': 'Connexion impossible. Vérifie ton réseau.',
  // Identity linking is not implemented yet (docs/prd.md §4.1) — tell the user
  // which door to use instead of failing silently.
  'auth/account-exists-with-different-credential':
    'Un compte existe déjà avec cette adresse, via une autre méthode de connexion. Utilise celle-là pour te connecter.',
};

/**
 * Codes Firebase reports for a rejected credential. On a password form that
 * means the user mistyped something; on a social provider it means the token
 * itself was refused, and telling the user about a password they never typed
 * sends them chasing the wrong problem.
 */
const REJECTED_CREDENTIAL_CODES = [ 'auth/wrong-password', 'auth/invalid-credential' ];

const FALLBACK_MESSAGE = 'Quelque chose s\'est mal passé. Réessaie.';

const messageForCode = (code: string, method: SignInMethod): string => {
  if (REJECTED_CREDENTIAL_CODES.includes(code)) {
    return method === 'password'
      ? 'Adresse e-mail ou mot de passe incorrect.'
      : `La connexion ${METHOD_LABELS[method]} a été refusée. Réessaie, ou passe par une autre méthode.`;
  }

  if (code === 'auth/operation-not-allowed') {
    return `La connexion ${METHOD_LABELS[method]} n'est pas disponible pour le moment.`;
  }

  return FIREBASE_MESSAGES[code] ?? FALLBACK_MESSAGE;
};

/**
 * `functions/*` codes `users-deleteAccount` raises on purpose. Anything else is
 * a transport failure and falls back below — same split as
 * `src/friends/errors.ts` for the invitation callable.
 */
const DELETE_ACCOUNT_MESSAGES: Record<string, string> = {
  'functions/unauthenticated': 'Reconnecte-toi pour supprimer ton compte.',
  // Everything the account owned is already gone at this point; only the
  // sign-in survived, and retrying is what finishes the job.
  'functions/internal': 'La suppression n\'est pas allée au bout. Réessaie dans un instant.',
};

const DELETE_ACCOUNT_FALLBACK = 'La suppression n\'a pas abouti. Vérifie ta connexion et réessaie.';

/**
 * Never returns a raw `functions/*` code, the way `authErrorMessage` never
 * returns an `auth/*` one.
 */
export const deleteAccountErrorMessage = (error: unknown): string => {
  if (isFirebaseError(error)) {
    console.warn(`[auth] account deletion failed with ${error.code}`, error.message);

    return DELETE_ACCOUNT_MESSAGES[error.code] ?? DELETE_ACCOUNT_FALLBACK;
  }

  console.warn('[auth] account deletion failed', error);

  return DELETE_ACCOUNT_FALLBACK;
};

/**
 * Never returns a raw `auth/*` code — the code goes to the console instead, so a
 * developer can still tell a provider misconfiguration from a user mistake.
 */
export const authErrorMessage = (error: unknown, method: SignInMethod = 'password'): string => {
  if (error instanceof SignInUnavailableError) {
    return error.message;
  }

  if (isFirebaseError(error)) {
    console.warn(`[auth] ${method} sign-in failed with ${error.code}`, error.message);

    return messageForCode(error.code, method);
  }

  console.warn(`[auth] ${method} sign-in failed`, error);

  return FALLBACK_MESSAGE;
};
