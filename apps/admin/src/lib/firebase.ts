import { type FirebaseApp, getApps, initializeApp } from 'firebase/app';
import { type Auth, connectAuthEmulator, getAuth } from 'firebase/auth';
import { type Firestore, connectFirestoreEmulator, getFirestore } from 'firebase/firestore';

/**
 * Firebase web app config — public by design, inlined in the bundle at build
 * time. Same project as `apps/app`: this interface is another door onto the
 * same accounts and the same `v1_questions` pot.
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app: FirebaseApp = getApps()[0] ?? initializeApp(firebaseConfig);

/**
 * The browser build, unlike `apps/app`'s: persistence is `indexedDB` out of the
 * box, so there is no `initializeAuth` dance to run here.
 */
export const auth: Auth = getAuth(app);

export const db: Firestore = getFirestore(app);

/**
 * Emulator wiring is development-only. `vite build` compiles `import.meta.env.DEV`
 * to `false`, so a deployed bundle cannot be pointed at a localhost emulator by a
 * `.env.local` left over from a dev session.
 */
if (import.meta.env.DEV) {
  if (import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST && import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_PORT) {
    connectAuthEmulator(
      auth,
      `http://${import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST}:${import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_PORT}`,
      { disableWarnings: true },
    );
  }

  if (import.meta.env.VITE_FIREBASE_FIRESTORE_EMULATOR_HOST && import.meta.env.VITE_FIREBASE_FIRESTORE_EMULATOR_PORT) {
    connectFirestoreEmulator(
      db,
      import.meta.env.VITE_FIREBASE_FIRESTORE_EMULATOR_HOST,
      Number(import.meta.env.VITE_FIREBASE_FIRESTORE_EMULATOR_PORT),
    );
  }
}
