import {
  GoogleAuthProvider,
  OAuthProvider,
  type UserCredential,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import { Platform } from 'react-native';

import { auth } from '@/lib/firebase';

import { SignInCancelledError, SignInUnavailableError } from './errors';
import { loadAppleAuthentication, loadCrypto, loadGoogleSignIn } from './nativeModules';
import { rememberProfileHints } from './profileHints';

const MISSING_NATIVE_MODULE = 'Cette méthode de connexion manque à cette version de l\'app. Reconstruis le dev client.';

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

/**
 * Hides the Google button on a build that ships without OAuth client ids, or
 * whose binary predates the native module.
 *
 * iOS needs its own client id on top of the web one, because the matching URL
 * scheme has to be registered in the binary at build time (see app.config.ts).
 * Without it the native SDK refuses the sign-in, so the button is hidden rather
 * than left to fail on tap.
 */
export const isGoogleSignInAvailable = (): boolean => {
  if (!GOOGLE_WEB_CLIENT_ID) {
    return false;
  }

  if (Platform.OS === 'ios' && !GOOGLE_IOS_CLIENT_ID) {
    return false;
  }

  return loadGoogleSignIn() !== null;
};

let googleConfigured = false;

const requireGoogleSignIn = () => {
  const google = loadGoogleSignIn();

  if (!google) {
    throw new SignInUnavailableError(MISSING_NATIVE_MODULE);
  }

  if (!googleConfigured) {
    if (!GOOGLE_WEB_CLIENT_ID) {
      throw new SignInUnavailableError('La connexion Google n\'est pas configurée sur cette version de l\'app.');
    }

    // Firebase only accepts an id token minted for the *web* client, even on
    // native — hence webClientId here, whatever the platform.
    google.GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      ...(GOOGLE_IOS_CLIENT_ID ? { iosClientId: GOOGLE_IOS_CLIENT_ID } : {}),
    });

    googleConfigured = true;
  }

  return google;
};

export const signInWithGoogle = async (): Promise<UserCredential> => {
  const { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } = requireGoogleSignIn();

  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    const response = await GoogleSignin.signIn();

    if (!isSuccessResponse(response)) {
      throw new SignInCancelledError();
    }

    const { idToken } = response.data;

    if (!idToken) {
      throw new SignInUnavailableError('Google n\'a pas renvoyé de jeton d\'identité.');
    }

    return await signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
  } catch (error) {
    if (isErrorWithCode(error) && error.code === statusCodes.SIGN_IN_CANCELLED) {
      throw new SignInCancelledError();
    }

    if (isErrorWithCode(error) && error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new SignInUnavailableError('Les services Google Play ne sont pas disponibles sur cet appareil.');
    }

    throw error;
  }
};

export const isAppleSignInAvailableAsync = async (): Promise<boolean> => {
  if (Platform.OS !== 'ios') {
    return false;
  }

  const apple = loadAppleAuthentication();

  return apple ? apple.isAvailableAsync() : false;
};

const HEX = (byte: number) => byte.toString(16).padStart(2, '0');

/**
 * Apple signs the *hashed* nonce into the identity token; Firebase re-hashes the
 * raw one to check they match. Sending the raw nonce to Apple would let a
 * replayed token pass.
 */
const createNonce = async (): Promise<{ rawNonce: string; hashedNonce: string }> => {
  const crypto = loadCrypto();

  if (!crypto) {
    throw new SignInUnavailableError(MISSING_NATIVE_MODULE);
  }

  const bytes = await crypto.getRandomBytesAsync(32);
  const rawNonce = Array.from(bytes).map(HEX).join('');
  const hashedNonce = await crypto.digestStringAsync(crypto.CryptoDigestAlgorithm.SHA256, rawNonce);

  return { rawNonce, hashedNonce };
};

export const signInWithApple = async (): Promise<UserCredential> => {
  const apple = loadAppleAuthentication();

  if (!apple) {
    throw new SignInUnavailableError(MISSING_NATIVE_MODULE);
  }

  const { rawNonce, hashedNonce } = await createNonce();

  try {
    const credential = await apple.signInAsync({
      requestedScopes: [
        apple.AppleAuthenticationScope.FULL_NAME,
        apple.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });

    if (!credential.identityToken) {
      throw new SignInUnavailableError('Apple n\'a pas renvoyé de jeton d\'identité.');
    }

    // Apple hands over the name on the first authorization only — never again,
    // and never through Firebase Auth. Record it before signing in, so the
    // profile document can be created with it.
    const givenName = credential.fullName?.givenName?.trim();

    if (givenName) {
      rememberProfileHints({ displayName: givenName });
    }

    return await signInWithCredential(
      auth,
      new OAuthProvider('apple.com').credential({ idToken: credential.identityToken, rawNonce }),
    );
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ERR_REQUEST_CANCELED') {
      throw new SignInCancelledError();
    }

    throw error;
  }
};

export const signInWithEmail = async (email: string, password: string): Promise<UserCredential> => (
  signInWithEmailAndPassword(auth, email, password)
);

export const signUpWithEmail = async (
  email: string,
  password: string,
  displayName: string,
): Promise<UserCredential> => {
  rememberProfileHints({ displayName });

  const userCredential = await createUserWithEmailAndPassword(auth, email, password);

  await updateProfile(userCredential.user, { displayName });
  // docs/prd.md §4.1 — an email account must be verified before reaching the app.
  await sendEmailVerification(userCredential.user);

  return userCredential;
};

export const resendVerificationEmail = async (): Promise<void> => {
  const { currentUser } = auth;

  if (!currentUser) {
    throw new SignInUnavailableError('Aucune session en cours.');
  }

  await sendEmailVerification(currentUser);
};

export const signOut = async (): Promise<void> => {
  // Without this, Google's native SDK keeps the account selected and the next
  // sign-in skips the account picker entirely.
  if (googleConfigured) {
    await loadGoogleSignIn()?.GoogleSignin.signOut().catch(() => undefined);
  }

  await firebaseSignOut(auth);
};
