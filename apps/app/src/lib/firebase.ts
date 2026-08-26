import { getApp } from '@react-native-firebase/app';
import { type Auth, connectAuthEmulator, getAuth } from '@react-native-firebase/auth';
import { type Firestore, connectFirestoreEmulator, getFirestore } from '@react-native-firebase/firestore';

/**
 * React Native Firebase — the **native** Firebase SDKs behind a JS layer, not
 * the `firebase` web SDK running on the JS thread.
 *
 * What that changes here, and it is the whole file: **there is nothing to
 * configure at runtime.** The default app is created by the native SDK at
 * launch, off `google-services.json` (Android) and `GoogleService-Info.plist`
 * (iOS) — the two files `app.config.ts` declares per variant, baked into the
 * binary at build time. The `EXPO_PUBLIC_FIREBASE_*` values this file used to
 * assemble a config from are gone: a value read from the JS bundle cannot
 * configure an SDK that was already initialised natively.
 *
 * The consequence is worth stating: **changing the Firebase project now takes a
 * build**, never a Metro restart or an OTA update — the same rule the Google
 * OAuth URL scheme already lives under.
 */
const firebaseApp = (() => {
  try {
    return getApp();
  } catch (cause) {
    // The native app is missing, which means the build carried no service file
    // — `app.config.ts` resolved `googleServicesFile` to nothing, or prebuild
    // ran before the file existed. `getApp()`'s own message ("No Firebase App
    // '[DEFAULT]' has been created") points at the JS, where the fix is not.
    throw new Error(
      '[firebase] No default Firebase app. This build shipped without its service file — ' +
        'put google-services.json / GoogleService-Info.plist under apps/app/firebase/ ' +
        '(see apps/app/firebase/README.md) and rebuild the dev client; Metro alone cannot fix it.',
      { cause },
    );
  }
})();

export const app = firebaseApp;

/**
 * Auth persists on its own here — the native SDKs keep the session in the
 * Keychain / SharedPreferences, so the `initializeAuth` + `getReactNativePersistence`
 * + AsyncStorage dance the web SDK needed is gone, along with the `@ts-expect-error`
 * that came with it.
 */
export const auth: Auth = getAuth(app);

export const db: Firestore = getFirestore(app);

if (__DEV__) {
  // [DEBUG:state] What the *bundle* holds — EXPO_PUBLIC_* values are inlined by
  // Metro at transform time, so a stale cache or a typo in .env.local shows up
  // here as `undefined` whatever the file on disk says.
  console.log('[DEBUG:state] emulator wiring', {
    authHost: process.env.EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST,
    authPort: process.env.EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_PORT,
    firestoreHost: process.env.EXPO_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST,
    firestorePort: process.env.EXPO_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_PORT,
    functionsHost: process.env.EXPO_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_HOST,
    functionsPort: process.env.EXPO_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_PORT,
    projectId: firebaseApp.options.projectId,
  });
}

if (process.env.EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST && process.env.EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_PORT) {
  connectAuthEmulator(
    auth,
    `http://${process.env.EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST}:${process.env.EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_PORT}`,
  );
}

if (process.env.EXPO_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST && process.env.EXPO_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_PORT) {
  connectFirestoreEmulator(
    db,
    process.env.EXPO_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST,
    Number(process.env.EXPO_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_PORT),
  );
  // [DEBUG:branch] Firestore emulator connected
  console.log('[DEBUG:branch] connectFirestoreEmulator ran');
} else if (__DEV__) {
  // [DEBUG:branch] guard was false — the bundle carries no Firestore emulator host/port
  console.log('[DEBUG:branch] connectFirestoreEmulator SKIPPED');
}
