import { useEffect } from 'react';

import { useAuth } from '@/auth/AuthContext';

import { identify, setUserProperty } from './analytics';
import { streakBucketOf } from './events';

/**
 * Wires the analytics wrapper to the session.
 *
 * Mounted **once** from `src/App.tsx` (`SessionGate`) — inside the provider,
 * like `usePushNotifications`, so it hangs off `useAuth()`.
 *
 * Two responsibilities:
 * 1. **Identity** — pushes the Firebase Auth UID to GA4 as User-ID at sign-in,
 *    clears it at sign-out. GA4 keeps events tied to the device otherwise, so
 *    a null user id is not « no event » — it is « one that is not tied to a
 *    user account ».
 * 2. **User properties** — `session_state` and `streak_bucket`, refreshed on
 *    every change of the profile subscription.
 *
 * Consent (the CNIL question) is deliberately not handled here: it will land
 * as its own layer around the wrapper. Nothing about that shape belongs on
 * `useAuth()`.
 */
export const useAnalyticsIdentity = (): void => {
  const { user, profile } = useAuth();

  useEffect(() => {
    identify(user?.uid ?? null);
    setUserProperty('session_state', user ? 'authenticated' : 'anonymous');
  }, [ user ]);

  useEffect(() => {
    if (!profile) {
      setUserProperty('streak_bucket', null);

      return;
    }

    setUserProperty('streak_bucket', streakBucketOf(profile.streak_count ?? 0));
  }, [ profile ]);
};
