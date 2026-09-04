import { useEffect } from 'react';

import { useAuth } from '@/auth/AuthContext';

import { identify, setEnabled, setUserProperty } from './analytics';
import { streakBucketOf } from './events';
import { primeAnalyticsOptOut, useAnalyticsOptOut } from './preferences';

/**
 * Wires the analytics wrapper to the session and to the opt-out flag.
 *
 * Mounted **once** from `src/App.tsx` (`SessionGate`) — inside the provider,
 * like `usePushNotifications`, so it hangs off `useAuth()`.
 *
 * Three responsibilities, one place:
 * 1. **Identity** — pushes the Firebase Auth UID to GA4 as User-ID at sign-in,
 *    clears it at sign-out. GA4 keeps events tied to the device otherwise, so
 *    a null user id is not « no event » — it is « one that is not tied to a
 *    user account ».
 * 2. **User properties** — `session_state` and `streak_bucket`, refreshed on
 *    every change of the profile subscription. `analytics_consent` is set by
 *    the opt-out effect below, since it moves independently.
 * 3. **Consent** — flips the SDK's own collection on or off through
 *    `setAnalyticsCollectionEnabled`, so anything the native side would
 *    schedule (app_open, screen_view from the OS) stops at the source. Also
 *    warms the opt-out cache once so the first events after launch read a
 *    resolved value rather than the default.
 */
export const useAnalyticsIdentity = (): void => {
  const { user, profile } = useAuth();
  const { resolved, optedOut } = useAnalyticsOptOut();

  useEffect(() => {
    primeAnalyticsOptOut();
  }, []);

  useEffect(() => {
    if (!resolved) {
      return;
    }

    setEnabled(!optedOut);
    setUserProperty('analytics_consent', optedOut ? 'opt_out' : 'opt_in');
  }, [ resolved, optedOut ]);

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
