import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { onSnapshot } from 'firebase/firestore';
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { USER_COLLECTION, type UserData, userConverter } from '@statowrel/models';

import { auth } from '@/lib/firebase';
import { getDocumentRef } from '@/lib/firestore';

import { createUserProfile, syncUserProfile } from './profile';

export interface AuthContextValue {
  /** Firebase Auth session, or null when signed out. */
  user: User | null;
  /**
   * `v1_users/{uid}`, live — null while it loads, and for an account that has
   * not been through onboarding yet.
   *
   * Subscribed to rather than read: the counters on it — streak, record,
   * answered days — belong to the answer trigger (docs/prd.md §4.6), which
   * moves them a beat after the app writes an answer. A read would have to
   * guess when that beat has passed.
   */
  profile: UserData | null;
  /** True until the persisted session has been restored — hold the splash screen. */
  initializing: boolean;
  /** True while the session has no username yet: the onboarding sheet is what settles it. */
  needsOnboarding: boolean;
  /** Claims the chosen username and writes the profile, which is what opens the app up. */
  completeOnboarding: (username: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [ user, setUser ] = useState<User | null>(null);
  const [ initializing, setInitializing ] = useState(true);
  // The snapshot carries the account it describes, so switching account never
  // shows the previous one's profile for a render — and nothing has to be reset
  // on the way out.
  const [ loaded, setLoaded ] = useState<{ uid: string; profile: UserData | null } | null>(null);

  useEffect(() => onAuthStateChanged(auth, (nextUser) => {
    setUser(nextUser);

    if (nextUser === null) {
      setInitializing(false);

      return;
    }

    // Mirrors Auth back into the profile, and nothing more: what it writes
    // comes back through the subscription below, which is what holds the state.
    // Failing is survivable — the copy in Firestore is a mirror, Auth stays the
    // source of truth — so this never blocks the session.
    syncUserProfile(nextUser).catch((error: unknown) => {
      console.warn('[auth] could not sync the user profile', error);
    });
  }), []);

  useEffect(() => {
    if (user === null) {
      return undefined;
    }

    const uid = user.uid;

    return onSnapshot(
      getDocumentRef(USER_COLLECTION, uid, userConverter),
      (snapshot) => {
        setLoaded({ uid, profile: snapshot.data() ?? null });
        setInitializing(false);
      },
      (error) => {
        // A profile that cannot be read must not lock the user out of the app,
        // and must not send an account that already has a username back through
        // onboarding: the next session restore retries it.
        console.warn('[auth] lost the user profile subscription', error);
        setInitializing(false);
      },
    );
  }, [ user ]);

  const current = user !== null && loaded?.uid === user.uid ? loaded : null;
  const profile = current?.profile ?? null;
  // No document at all is an account that has signed in and not chosen a handle
  // yet; a document without a username predates them. Both go through the
  // sheet, and `createUserProfile` completes the second in place rather than
  // starting a new one. Neither is true while the first snapshot is still out —
  // `initializing` is what holds the splash screen until then.
  const needsOnboarding = current !== null && (current.profile === null || current.profile.username === '');

  const completeOnboarding = useCallback(async (username: string) => {
    if (!user) {
      throw new Error('completeOnboarding requires a signed-in user.');
    }

    // The subscription above is what clears `needsOnboarding`: Firestore hands
    // a local write straight to its own listeners, so the sheet closes on the
    // write rather than on the round trip.
    await createUserProfile(user, username, profile);
  }, [ user, profile ]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    profile,
    initializing,
    needsOnboarding,
    completeOnboarding,
  }), [ user, profile, initializing, needsOnboarding, completeOnboarding ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside an <AuthProvider>.');
  }

  return context;
};
