/**
 * Is this a failure Firebase itself raised, and what did it call it?
 *
 * The web SDK shipped a `FirebaseError` class one could `instanceof`. React
 * Native Firebase raises `NativeFirebaseError` instead, and does **not** export
 * it: it is reachable only through `@react-native-firebase/app/lib/internal`,
 * which is a private path this app has no business importing. So the check is
 * structural — an `Error` carrying a string `code` — which is all any of the
 * call sites ever wanted from it.
 *
 * **The codes are namespaced, and one namespace changed.** React Native
 * Firebase builds every code as `{namespace}/{native code}` —
 * `auth/wrong-password` and `functions/not-found` read exactly as they did
 * under the web SDK, but a Firestore failure the web SDK reported bare as
 * `permission-denied` now arrives as `firestore/permission-denied`. Anything
 * comparing a Firestore code carries that prefix.
 */
export const isFirebaseError = (error: unknown): error is Error & { code: string } => (
  error instanceof Error && typeof (error as { code?: unknown }).code === 'string'
);

/** The error's Firebase code, or `'unknown'` — for a log line, never for a branch. */
export const firebaseErrorCode = (error: unknown): string => (
  isFirebaseError(error) ? error.code : 'unknown'
);
