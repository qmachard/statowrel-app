import { FirebaseError } from 'firebase/app';

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

const FIREBASE_MESSAGES: Record<string, string> = {
  'auth/invalid-email': 'Cette adresse e-mail n\'est pas valide.',
  'auth/user-disabled': 'Ce compte a été désactivé.',
  'auth/user-not-found': 'Aucun compte ne correspond à cette adresse.',
  'auth/wrong-password': 'Adresse e-mail ou mot de passe incorrect.',
  'auth/invalid-credential': 'Adresse e-mail ou mot de passe incorrect.',
  'auth/email-already-in-use': 'Un compte existe déjà avec cette adresse.',
  'auth/weak-password': 'Ce mot de passe est trop court.',
  'auth/too-many-requests': 'Trop de tentatives. Réessaie dans quelques minutes.',
  'auth/network-request-failed': 'Connexion impossible. Vérifie ton réseau.',
  'auth/operation-not-allowed': 'Cette méthode de connexion n\'est pas activée sur le projet Firebase.',
  // Identity linking is not implemented yet (docs/prd.md §4.1) — tell the user
  // which door to use instead of failing silently.
  'auth/account-exists-with-different-credential':
    'Un compte existe déjà avec cette adresse, via une autre méthode de connexion. Utilise celle-là pour te connecter.',
};

const FALLBACK_MESSAGE = 'Quelque chose s\'est mal passé. Réessaie.';

export const authErrorMessage = (error: unknown): string => {
  if (error instanceof SignInUnavailableError) {
    return error.message;
  }

  if (error instanceof FirebaseError) {
    return FIREBASE_MESSAGES[error.code] ?? FALLBACK_MESSAGE;
  }

  return FALLBACK_MESSAGE;
};
