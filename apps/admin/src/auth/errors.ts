import { FirebaseError } from 'firebase/app';

/** Which door the user came through — the same Firebase code means different things per provider. */
export type SignInMethod = 'password' | 'google';

const METHOD_LABELS: Record<SignInMethod, string> = {
  password: 'e-mail',
  google: 'Google',
};

/**
 * Closing the Google popup, or opening a second one, is not a failure — the
 * caller drops these instead of showing a message.
 */
const CANCELLED_CODES = [
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
  'auth/user-cancelled',
];

export const isCancelledSignIn = (error: unknown): boolean => (
  error instanceof FirebaseError && CANCELLED_CODES.includes(error.code)
);

const FIREBASE_MESSAGES: Record<string, string> = {
  'auth/invalid-email': 'Cette adresse e-mail n\'est pas valide.',
  'auth/user-disabled': 'Ce compte a été désactivé.',
  'auth/user-not-found': 'Aucun compte ne correspond à cette adresse.',
  'auth/too-many-requests': 'Trop de tentatives. Réessaie dans quelques minutes.',
  'auth/network-request-failed': 'Connexion impossible. Vérifie ton réseau.',
  'auth/popup-blocked': 'Ton navigateur a bloqué la fenêtre Google. Autorise-la, puis réessaie.',
  'auth/account-exists-with-different-credential':
    'Un compte existe déjà avec cette adresse, via une autre méthode de connexion. Utilise celle-là pour te connecter.',
};

/**
 * Codes Firebase reports for a rejected credential. On a password form that
 * means the user mistyped something; on Google it means the token itself was
 * refused, and telling the user about a password they never typed sends them
 * chasing the wrong problem.
 */
const REJECTED_CREDENTIAL_CODES = [ 'auth/wrong-password', 'auth/invalid-credential' ];

const FALLBACK_MESSAGE = 'Quelque chose s\'est mal passé. Réessaie.';

const messageForCode = (code: string, method: SignInMethod): string => {
  if (REJECTED_CREDENTIAL_CODES.includes(code)) {
    return method === 'password'
      ? 'Adresse e-mail ou mot de passe incorrect.'
      : 'La connexion Google a été refusée. Réessaie, ou passe par une autre méthode.';
  }

  if (code === 'auth/operation-not-allowed') {
    return `La connexion ${METHOD_LABELS[method]} n'est pas disponible pour le moment.`;
  }

  return FIREBASE_MESSAGES[code] ?? FALLBACK_MESSAGE;
};

/**
 * Never returns a raw `auth/*` code — the code goes to the console instead, so a
 * developer can still tell a provider misconfiguration from a user mistake.
 */
export const authErrorMessage = (error: unknown, method: SignInMethod = 'password'): string => {
  if (error instanceof FirebaseError) {
    console.warn(`[auth] ${method} sign-in failed with ${error.code}`, error.message);

    return messageForCode(error.code, method);
  }

  console.warn(`[auth] ${method} sign-in failed`, error);

  return FALLBACK_MESSAGE;
};
