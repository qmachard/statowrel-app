import type * as AppleAuthenticationModule from 'expo-apple-authentication';
import type * as CryptoModule from 'expo-crypto';
import type * as GoogleSignInModule from '@react-native-google-signin/google-signin';

/**
 * Google sign-in, Apple sign-in and `expo-crypto` are native modules: importing
 * them at module scope throws on a binary that was built before they were added
 * (a stale dev client, most often). Because the auth screens sit at the root of
 * the route tree, that turns a missing module into "Route is missing the
 * required default export" on *every* screen.
 *
 * Requiring them lazily keeps the failure where it belongs — on the button that
 * needs the module — so the rest of the app still runs and the user still gets
 * email/password sign-in.
 */
const loadOptional = <T>(load: () => T): T | null => {
  try {
    return load();
  } catch {
    return null;
  }
};

export const loadGoogleSignIn = (): typeof GoogleSignInModule | null => (
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  loadOptional(() => require('@react-native-google-signin/google-signin') as typeof GoogleSignInModule)
);

export const loadAppleAuthentication = (): typeof AppleAuthenticationModule | null => (
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  loadOptional(() => require('expo-apple-authentication') as typeof AppleAuthenticationModule)
);

export const loadCrypto = (): typeof CryptoModule | null => (
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  loadOptional(() => require('expo-crypto') as typeof CryptoModule)
);
