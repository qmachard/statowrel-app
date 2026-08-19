import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import type { UserData } from '@statowrel/models';

import { auth } from '@/lib/firebase';

import { ensureUserProfile } from './profile';
import { consumeProfileHints } from './profileHints';

export interface AuthContextValue {
  /** Firebase Auth session, or null when signed out. */
  user: User | null;
  /** `v1_users/{uid}`, null until it has been read or created. */
  profile: UserData | null;
  /** True until the persisted session has been restored — hold the splash screen. */
  initializing: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [ user, setUser ] = useState<User | null>(null);
  const [ profile, setProfile ] = useState<UserData | null>(null);
  const [ initializing, setInitializing ] = useState(true);

  useEffect(() => onAuthStateChanged(auth, async (nextUser) => {
    setUser(nextUser);

    if (!nextUser) {
      setProfile(null);
      setInitializing(false);

      return;
    }

    try {
      setProfile(await ensureUserProfile(nextUser, consumeProfileHints()));
    } catch (error) {
      // A failed profile write must not lock the user out of the app: the next
      // sign-in or session restore retries it.
      console.warn('[auth] could not sync the user profile', error);
      setProfile(null);
    } finally {
      setInitializing(false);
    }
  }), []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    profile,
    initializing,
  }), [ user, profile, initializing ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside an <AuthProvider>.');
  }

  return context;
};
