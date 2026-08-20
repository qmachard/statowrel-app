import type { User } from 'firebase/auth';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { auth } from '@/lib/firebase';

/** `null` while the claim is still being read — neither granted nor refused yet. */
type AdminState = boolean | null;

export interface AuthContextValue {
  /** Firebase Auth session, or null when signed out. */
  user: User | null;
  /**
   * Whether the session carries the `admin` custom claim.
   *
   * The same claim `isAdmin()` tests in `firestore.rules`, so the interface and
   * the rules agree on who is an admin. There is no sign-up: an account only
   * reaches this screen once the claim has been granted by hand
   * (`npm run set-admin`), and the claim is only ever granted server-side.
   */
  isAdmin: AdminState;
  /** True until the persisted session has been restored and its claim read. */
  initializing: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [ user, setUser ] = useState<User | null>(null);
  const [ initializing, setInitializing ] = useState(true);
  // Carries the account it describes, so switching account never shows the
  // previous one's verdict for a render.
  const [ claim, setClaim ] = useState<{ uid: string; isAdmin: boolean } | null>(null);

  useEffect(() => onAuthStateChanged(auth, (nextUser) => {
    setUser(nextUser);

    if (nextUser === null) {
      setClaim(null);
      setInitializing(false);
    }
  }), []);

  useEffect(() => {
    if (user === null) {
      return undefined;
    }

    let cancelled = false;
    const uid = user.uid;

    // Force a token refresh so a claim granted after the last sign-in is picked
    // up — an account promoted while its session was open would otherwise stay
    // locked out until the token expired on its own.
    user.getIdTokenResult(true)
      .then(({ claims }) => {
        if (!cancelled) {
          setClaim({ uid, isAdmin: claims.admin === true });
        }
      })
      .catch((error: unknown) => {
        // A claim that cannot be read is not a claim that was granted: refuse,
        // and let the user retry by signing in again.
        console.warn('[auth] could not read the admin claim', error);

        if (!cancelled) {
          setClaim({ uid, isAdmin: false });
        }
      })
      .finally(() => {
        if (!cancelled) {
          setInitializing(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [ user ]);

  const isAdmin = user !== null && claim?.uid === user.uid ? claim.isAdmin : null;

  const signOut = useCallback(async () => {
    setClaim(null);
    await firebaseSignOut(auth);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isAdmin,
    initializing,
    signOut,
  }), [ user, isAdmin, initializing, signOut ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside an <AuthProvider>.');
  }

  return context;
};
