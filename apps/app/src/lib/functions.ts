import { getIdToken } from '@react-native-firebase/auth';
import { type Functions, connectFunctionsEmulator, getFunctions, httpsCallable } from '@react-native-firebase/functions';

import { app, auth } from './firebase';

/**
 * Client-side counterpart of `apps/functions/src/libs/firebase-admin.ts`'s
 * `REGION_CLOUD`: a callable is looked up by region, and a mismatch fails at
 * runtime with a 404 rather than at compile time. The two are changed together.
 */
const REGION = 'europe-west1';

export const functions: Functions = getFunctions(app, REGION);

if (process.env.EXPO_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_HOST && process.env.EXPO_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_PORT) {
  connectFunctionsEmulator(
    functions,
    process.env.EXPO_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_HOST,
    Number(process.env.EXPO_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_PORT),
  );
}

/**
 * Calls a callable Cloud Function and hands back its result, typed through the
 * contract both sides share (`@statowrel/models`'s `callables.ts`).
 *
 * The ID token travels with the call and is verified by the runtime, so nothing
 * here has to fetch or attach one — which is the reason the backend exposes
 * this as a callable rather than as an HTTP route.
 *
 * Failures come back as a `FirebaseError` carrying a `functions/*` code; they
 * are translated where they are caught, never surfaced raw (see
 * `src/friends/errors.ts`).
 */
export const callFunction = async <TPayload, TResult>(name: string, payload: TPayload): Promise<TResult> => {
  // **Probe, and a candidate fix in the same line.** The backend sees no
  // `Authorization` header on a call made from a signed-in session — a known
  // react-native-firebase complaint (invertase/react-native-firebase#8492,
  // #6622) rather than anything the callable does. Asking the user for their
  // ID token first is the cheapest theory: it forces the native auth interop
  // the Functions SDK reads through to resolve a token before the request is
  // built. If it turns out not to be what fixes it, this line goes.
  const user = auth.currentUser;
  const token = user === null ? null : await getIdToken(user);

  if (__DEV__) {
    console.log(`[functions] ${name}: user ${user?.uid ?? 'none'}, token ${token === null ? 'none' : `${token.length} chars`}`);
  }

  const { data } = await httpsCallable<TPayload, TResult>(functions, name)(payload);

  return data;
};
