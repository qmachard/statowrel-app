import AsyncStorage from '@react-native-async-storage/async-storage';
import { type FirebaseApp, getApps, initializeApp } from 'firebase/app';
import { type Auth, getAuth, initializeAuth } from 'firebase/auth';
import { connectFirestoreEmulator, type Firestore, getFirestore } from 'firebase/firestore';

// getReactNativePersistence exists in firebase/auth's React Native build
// (used at runtime — see metro.config.js) but its package.json "exports"
// map lists a "types" condition before "react-native", so tsc always
// resolves the browser build's types instead, which don't declare it.
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

// initializeAuth() throws if called more than once for the same app (e.g. on
// Fast Refresh) — fall back to the already-registered instance.
let authInstance: Auth;
try {
  authInstance = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  authInstance = getAuth(app);
}

export const auth = authInstance;

export const db: Firestore = getFirestore(app);

if (process.env.EXPO_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST && process.env.EXPO_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_PORT) {
  connectFirestoreEmulator(
    db,
    process.env.EXPO_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST,
    Number(process.env.EXPO_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_PORT),
  );
}
