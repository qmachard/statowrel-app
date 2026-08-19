import { createAsyncStorage } from '@react-native-async-storage/async-storage';
import { type FirebaseApp, getApps, initializeApp } from 'firebase/app';
import { type Auth, connectAuthEmulator, getAuth, initializeAuth } from 'firebase/auth';
import { connectFirestoreEmulator, type Firestore, getFirestore } from 'firebase/firestore';

// getReactNativePersistence only exists in firebase/auth's React Native build
// (`@firebase/auth/dist/rn`), which is what Metro loads at runtime — see
// metro.config.js. tsc, however, resolves `firebase/auth` through the umbrella
// package's `typings` field, which points at the browser build's declarations,
// so the export is invisible to the type checker.
// https://github.com/firebase/firebase-js-sdk/issues/8353
// @ts-expect-error - see comment above
import { getReactNativePersistence } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const app: FirebaseApp = getApps()[0] ?? initializeApp(firebaseConfig);

// `@react-native-async-storage/async-storage` v3 replaced the implicit default
// store with an explicitly named one; this is the form firebase/auth's own React
// Native build documents for v3.
const authStorage = createAsyncStorage('statowrel-auth');

// initializeAuth() throws if called more than once for the same app (e.g. on
// Fast Refresh) — fall back to the already-registered instance. Anything else
// is a real wiring problem: log it, because getAuth()'s own failure below would
// otherwise replace it with a far less useful message.
let authInstance: Auth;
try {
  authInstance = initializeAuth(app, {
    persistence: getReactNativePersistence(authStorage),
  });
} catch (error) {
  console.warn('[firebase] initializeAuth() failed, falling back to getAuth()', error);
  authInstance = getAuth(app);
}

export const auth = authInstance;

export const db: Firestore = getFirestore(app);

if (process.env.EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST && process.env.EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_PORT) {
  connectAuthEmulator(
    auth,
    `http://${process.env.EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST}:${process.env.EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_PORT}`,
    { disableWarnings: true },
  );
}

if (process.env.EXPO_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST && process.env.EXPO_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_PORT) {
  connectFirestoreEmulator(
    db,
    process.env.EXPO_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST,
    Number(process.env.EXPO_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_PORT),
  );
}
