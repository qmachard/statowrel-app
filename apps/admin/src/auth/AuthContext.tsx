import type { User } from 'firebase/auth';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { getDoc } from 'firebase/firestore';
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { USER_COLLECTION, userConverter } from '@statowrel/models';

import { auth } from '@/lib/firebase';
import { getDocumentRef } from '@/lib/firestore';

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
  /**
   * The moderator's own handle, off their `v1_users` profile — `null` when they
   * have no app account, which most of them will not.
   *
   * Read once, here, rather than at every write: a question created from the
   * console carries its author's handle (`author_username`), and resolving it
   * where it is used would be one profile read per question written. The
   * session already reads the account's claim on the way in, so this rides
   * along with it.
   */
  username: string | null;
  /** True until the persisted session has been restored and its claim read. */
  initializing: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [ user, setUser ] = useState<User | null>(null);
  const [ initializing, setInitializing ] = useState(true);
  // Carries the account it describes, so switching account never shows the
  // previous one's verdict — or handle — for a render.
  const [ session, setSession ] = useState<{ uid: string; isAdmin: boolean; username: string | null } | null>(null);

  useEffect(() => onAuthStateChanged(auth, (nextUser) => {
    setUser(nextUser);

    if (nextUser === null) {
      setSession(null);
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
    const readClaim = user.getIdTokenResult(true)
      .then(({ claims }) => claims.admin === true)
      .catch((error: unknown) => {
        // A claim that cannot be read is not a claim that was granted: refuse,
        // and let the user retry by signing in again.
        console.warn('[auth] could not read the admin claim', error);

        return false;
      });

    // Alongside the claim and not after it: the two are independent, so the
    // handle costs the gate no latency it was not already paying for the token
    // refresh — and settling both before the console opens is what keeps the
    // first question written in a session from being credited to nobody.
    const readUsername = getDoc(getDocumentRef(USER_COLLECTION, uid, userConverter))
      .then((snapshot) => snapshot.data()?.username ?? null)
      .catch((error: unknown) => {
        // A moderator has no reason to hold an app account, so a profile that
        // is missing or unreadable is an expected state here: it costs the
        // questions they write their credit, never their way in.
        console.warn('[auth] could not read the moderator profile', error);

        return null;
      });

    void Promise.all([ readClaim, readUsername ])
      .then(([ isAdmin, username ]) => {
        if (!cancelled) {
          setSession({ uid, isAdmin, username });
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

  const current = user !== null && session?.uid === user.uid ? session : null;
  const isAdmin = current?.isAdmin ?? null;

  const signOut = useCallback(async () => {
    setSession(null);
    await firebaseSignOut(auth);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isAdmin,
    username: current?.username ?? null,
    initializing,
    signOut,
  }), [ user, isAdmin, current, initializing, signOut ]);

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
