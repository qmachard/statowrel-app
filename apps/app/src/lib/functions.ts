import { getIdToken } from '@react-native-firebase/auth';
import { type Functions, connectFunctionsEmulator, getFunctions, httpsCallable } from '@react-native-firebase/functions';

import { app, auth } from './firebase';

/**
 * Client-side counterpart of `apps/functions/src/libs/firebase-admin.ts`'s
 * `REGION_CLOUD`: a callable is looked up by region, and a mismatch fails at
 * runtime with a 404 rather than at compile time. The two are changed together.
 */
const REGION = 'europe-west1';

/** What the SDK waits, kept so the emulator path below cannot hang differently. */
const TIMEOUT_MS = 70_000;

const emulatorOrigin = (): string | null => {
  const host = process.env.EXPO_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_HOST;
  const port = process.env.EXPO_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_PORT;

  return host && port ? `http://${host}:${port}` : null;
};

const EMULATOR_ORIGIN = emulatorOrigin();

export const functions: Functions = getFunctions(app, REGION);

if (EMULATOR_ORIGIN !== null) {
  connectFunctionsEmulator(
    functions,
    process.env.EXPO_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_HOST as string,
    Number(process.env.EXPO_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_PORT),
  );
}

/**
 * A callable's failure, in the shape the app already reads failures in:
 * `isFirebaseError` is structural — an `Error` carrying a string `code` — and
 * every translator (`src/questions/errors.ts`, `src/friends/errors.ts`,
 * `src/auth/errors.ts`) branches on a `functions/*` code. Building the same
 * shape here is what lets the emulator path below reuse those tables unchanged.
 */
class CallableError extends Error {
  readonly code: string;

  readonly details: unknown;

  constructor(code: string, message: string, details: unknown = null) {
    super(message);
    this.name = 'CallableError';
    this.code = code;
    this.details = details;
  }
}

/**
 * The canonical status a callable answers with (`FAILED_PRECONDITION`) as the
 * code the app reads (`functions/failed-precondition`) — the same string the
 * SDK produces on the deployed path.
 */
const codeOfStatus = (status: string): string => `functions/${status.toLowerCase().replace(/_/g, '-')}`;

/** What a status-less failure is called, by HTTP status alone. */
const CODE_BY_HTTP_STATUS: Record<number, string> = {
  400: 'functions/invalid-argument',
  401: 'functions/unauthenticated',
  403: 'functions/permission-denied',
  404: 'functions/not-found',
  409: 'functions/aborted',
  429: 'functions/resource-exhausted',
  500: 'functions/internal',
  503: 'functions/unavailable',
  504: 'functions/deadline-exceeded',
};

/**
 * The emulator's own routing: one path segment per part of the name the
 * deployed URL encodes in its host. The project id comes off the native
 * Firebase app, the only thing that knows it — it is baked into the binary by
 * the service file, never read from the JS bundle.
 */
const emulatorEndpointOf = (name: string): string => (
  `${EMULATOR_ORIGIN as string}/${app.options.projectId}/${REGION}/${name}`
);

/**
 * The emulator path, built by hand — **because the SDK does not attach the ID
 * token to a call aimed at the Functions emulator.**
 *
 * The backend sees no `Authorization` header on a call made from a signed-in
 * session, so every callable that reads `request.auth` refuses everything: the
 * proposal sheet and the friend invitation both come back `unauthenticated`
 * while `auth.currentUser` holds a user and a token. A known complaint against
 * the library (invertase/react-native-firebase#8492, #6622), and not anything
 * the callables do — the same call made with `curl` and a token from the Auth
 * emulator goes through.
 *
 * It stayed invisible for as long as it did because **the deployed path is
 * fine**: the app's two older callables were only ever reached over the
 * network, where the token does travel — the friend invitation has been working
 * in production all along. So this is scoped to the emulator alone rather than
 * made the one path for both: production keeps the SDK it has been shipping
 * with, and nothing about how a deployed callable is reached changes here.
 *
 * The wire format is the callable protocol's own, so **the backend stays
 * exactly as it is**: `{ data }` on the way in, `{ result }` or `{ error }` on
 * the way out, and an `HttpsError`'s status mapped back to the `functions/*`
 * code the translators branch on.
 *
 * One property it gives up: the SDK's serialisation of types JSON has no place
 * for (a `Long`, a `Date`). Every payload in `callables.ts` is strings, numbers
 * and arrays of them, and it has to stay that way — a date crossing this seam
 * belongs there as an ISO string, like everything Firestore-facing already is.
 */
const callEmulatorFunction = async <TPayload, TResult>(name: string, payload: TPayload): Promise<TResult> => {
  const user = auth.currentUser;
  // No token for a signed-out caller, and no shortcut either: the call goes out
  // without the header and the callable answers `unauthenticated` itself, so
  // one place decides what a session is worth on both paths.
  const token = user === null ? null : await getIdToken(user);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;

  try {
    response = await fetch(emulatorEndpointOf(name), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token === null ? {} : { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ data: payload }),
      signal: controller.signal,
    });
  } catch (cause) {
    // A refused connection, a DNS failure, the abort above — `unavailable` is
    // what the SDK calls the same thing, which is what the translators expect.
    throw new CallableError('functions/unavailable', 'The function could not be reached.', cause);
  } finally {
    clearTimeout(timeout);
  }

  // A callable answers JSON on both paths. A body that is not JSON is a proxy,
  // a 502 or a crashed runtime — never something to read a result from.
  const body = await response.json().catch(() => null) as
    { result?: unknown; error?: { status?: string; message?: string; details?: unknown } } | null;

  if (!response.ok || body?.error) {
    const error = body?.error;
    const code = error?.status
      ? codeOfStatus(error.status)
      : CODE_BY_HTTP_STATUS[response.status] ?? 'functions/internal';

    throw new CallableError(code, error?.message ?? `The function failed with HTTP ${response.status}.`, error?.details);
  }

  return body?.result as TResult;
};

/**
 * Calls a callable Cloud Function and hands back its result, typed through the
 * contract both sides share (`@statowrel/models`'s `callables.ts`).
 *
 * Two paths, one contract. Against a **deployed** function the SDK does it: the
 * ID token travels with the call and is verified by the runtime, which is the
 * reason the backend exposes these as callables rather than as HTTP routes.
 * Against the **emulator** the request is built here, because the SDK does not
 * attach that token there — see `callEmulatorFunction`.
 *
 * Failures come back as an error carrying a `functions/*` code on either path;
 * they are translated where they are caught, never surfaced raw (see
 * `src/questions/errors.ts`).
 */
export const callFunction = async <TPayload, TResult>(name: string, payload: TPayload): Promise<TResult> => {
  if (EMULATOR_ORIGIN !== null) {
    return callEmulatorFunction<TPayload, TResult>(name, payload);
  }

  const { data } = await httpsCallable<TPayload, TResult>(functions, name)(payload);

  return data;
};
