import { useCallback } from 'react';

import { connectAuthEmulator, User as FirebaseUser, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { Authenticator, FirebaseCMSApp } from 'firecms';

import { firebaseConfig } from './firebase-config';

import collections from './collections';
import adminAuthenticator from './authenticator/admin';

export default function App() {
  const authenticator: Authenticator<FirebaseUser> = useCallback(adminAuthenticator, []);

  return (
    <FirebaseCMSApp
      name="StatOwrel"
      authentication={authenticator}
      collections={collections}
      firebaseConfig={firebaseConfig}
      locale="fr"
      onFirebaseInit={(_config, app) => {
        if (import.meta.env.VITE_FIREBASE_FIRESTORE_EMULATOR_HOST && import.meta.env.VITE_FIREBASE_FIRESTORE_EMULATOR_PORT) {
          const db = getFirestore(app);
          connectFirestoreEmulator(db, import.meta.env.VITE_FIREBASE_FIRESTORE_EMULATOR_HOST, Number(import.meta.env.VITE_FIREBASE_FIRESTORE_EMULATOR_PORT));
        }

        if (import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST && import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_PORT) {
          const auth = getAuth(app);

          connectAuthEmulator(auth, `http://${import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST}:${import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_PORT}`);
        }
      }}
    />
  );
}
