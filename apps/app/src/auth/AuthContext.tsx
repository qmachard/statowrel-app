import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import type { UserData } from '@statowrel/models';

import { auth } from '@/lib/firebase';

import { createUserProfile, syncUserProfile } from './profile';

export interface AuthContextValue {
  /** Firebase Auth session, or null when signed out. */
  user: User | null;
  /** `v1_users/{uid}`, null until it has been read or created. */
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
  const [ profile, setProfile ] = useState<UserData | null>(null);
  const [ initializing, setInitializing ] = useState(true);
  const [ needsOnboarding, setNeedsOnboarding ] = useState(false);

  useEffect(() => onAuthStateChanged(auth, async (nextUser) => {
    setUser(nextUser);

    if (!nextUser) {
      setProfile(null);
      setNeedsOnboarding(false);
      setInitializing(false);

      return;
    }

    try {
      const synced = await syncUserProfile(nextUser);

      setProfile(synced);
      // A profile without a username is one written before usernames existed:
      // it goes through onboarding too, and `createUserProfile` completes it in
      // place rather than starting a new one.
      setNeedsOnboarding(synced === null || synced.username === '');
    } catch (error) {
      // A failed profile read must not lock the user out of the app, and must
      // not send an account that already has a username back through onboarding:
      // the next sign-in or session restore retries it.
      console.warn('[auth] could not sync the user profile', error);
      setProfile(null);
      setNeedsOnboarding(false);
    } finally {
      setInitializing(false);
    }
  }), []);

  const completeOnboarding = useCallback(async (username: string) => {
    if (!user) {
      throw new Error('completeOnboarding requires a signed-in user.');
    }

    setProfile(await createUserProfile(user, username, profile));
    setNeedsOnboarding(false);
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
