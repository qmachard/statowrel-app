import AsyncStorage from '@react-native-async-storage/async-storage';
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

// Each value is read through a *literal* `process.env.EXPO_PUBLIC_…` member
// expression: that is the shape Expo's babel transform inlines at bundle time.
// A dynamic lookup (`process.env[name]`) is not inlined and comes back
// undefined on a device, which is why the names are repeated in the map below
// rather than iterated over here.
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// The three the app cannot start without. `authDomain` is only read by the web
// SDK's popup/redirect flows, which React Native never takes; `storageBucket`
// and `messagingSenderId` belong to products this app does not use yet.
const REQUIRED_CONFIG: Partial<Record<keyof typeof firebaseConfig, string>> = {
  apiKey: 'EXPO_PUBLIC_FIREBASE_API_KEY',
  projectId: 'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  appId: 'EXPO_PUBLIC_FIREBASE_APP_ID',
};

// These come from `.env.local` through Metro on a local run, and from the EAS
// environment on a build — two sources, neither of which sees the other, so a
// build can perfectly well ship with none of them. `initializeApp()` accepts
// that silently; the failure only surfaces further down as `auth/invalid-api-key`
// from whatever screen happened to touch Auth first, pointing at nothing.
const missingConfig = Object.entries(REQUIRED_CONFIG)
  .filter(([key]) => !firebaseConfig[key as keyof typeof firebaseConfig])
  .map(([, envVar]) => envVar);

if (missingConfig.length > 0) {
  throw new Error(
    `[firebase] Missing configuration: ${missingConfig.join(', ')}. ` +
      'Set them in apps/app/.env.local for a local run, and in the EAS environment ' +
      '(`eas env:create`) for a build — see apps/app/CLAUDE.md.',
  );
}

export const app: FirebaseApp = getApps()[0] ?? initializeApp(firebaseConfig);

// initializeAuth() throws if called more than once for the same app (e.g. on
// Fast Refresh) — fall back to the already-registered instance. Anything else
// is a real wiring problem: log it, because getAuth()'s own failure below would
// otherwise replace it with a far less useful message.
let authInstance: Auth;
try {
  authInstance = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
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
