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

import { ensureUserProfile } from './profile';
import { consumeProfileHints } from './profileHints';

export interface AuthContextValue {
  /** Firebase Auth session, or null when signed out. */
  user: User | null;
  /** `v1_users/{uid}`, null until it has been read or created. */
  profile: UserData | null;
  /** True until the persisted session has been restored — hold the splash screen. */
  initializing: boolean;
  /**
   * True for an email/password account whose address is still unverified
   * (docs/prd.md §4.1). Social accounts never hit this.
   */
  requiresEmailVerification: boolean;
  /** Re-reads the Firebase user, e.g. after the user clicked the verification link. */
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** An account whose only provider is a password owes Firebase a verified address. */
const isPasswordOnlyAccount = (user: User | null): boolean => (
  user !== null
  && user.providerData.length > 0
  && user.providerData.every((provider) => provider.providerId === 'password')
);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [ user, setUser ] = useState<User | null>(null);
  const [ profile, setProfile ] = useState<UserData | null>(null);
  const [ initializing, setInitializing ] = useState(true);
  // `user.reload()` mutates the same User object, so a re-render needs its own
  // trigger — this mirrors the flag we actually read.
  const [ emailVerified, setEmailVerified ] = useState(false);

  useEffect(() => onAuthStateChanged(auth, async (nextUser) => {
    setUser(nextUser);
    setEmailVerified(nextUser?.emailVerified ?? false);

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

  const refreshUser = useCallback(async () => {
    const { currentUser } = auth;

    if (!currentUser) {
      return;
    }

    await currentUser.reload();
    setUser(currentUser);
    setEmailVerified(currentUser.emailVerified);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    profile,
    initializing,
    requiresEmailVerification: isPasswordOnlyAccount(user) && !emailVerified,
    refreshUser,
  }), [ user, profile, initializing, emailVerified, refreshUser ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside an <AuthProvider>.');
  }

  return context;
};
