import * as Linking from 'expo-linking';
import { useEffect, useRef } from 'react';

import { track } from '@/analytics/analytics';
import { useAuth } from '@/auth/AuthContext';
import { referrerFromUrl } from '@/referrals/links';

import { clearPendingReferrer, rememberPendingReferrer } from './pendingReferrerStore';

/**
 * Keeps the sponsor's handle out of a `/i/{handle}` link that was opened before
 * there was an account to attribute — docs/prd.md §4.9.
 *
 * The other half of `pendingReferrerStore`, and the same arrangement as the
 * onboarding demo's (`useDemoAnswerFlush`): one hook mounted from
 * `src/App.tsx`, hanging off `useAuth()`. A link is tapped by somebody who, by
 * definition, has not signed up yet — that is what an invitation is — and
 * `referred_by` is only accepted on the profile's create, so the handle has to
 * survive the sign-in screen, the provider round trip and the username sheet.
 *
 * **Navigating is not this hook's job.** When a session exists, React
 * Navigation's own `linking` matches the same URL onto the invitation sheet
 * with the handle pre-filled — an account that already exists cannot be
 * attributed, so the useful thing to offer it is the friend request. When there
 * is no session, that route is not even registered (`RootNavigator` only mounts
 * the half of the stack the session can reach), so nothing happens on screen
 * and this is the whole of the behaviour.
 *
 * The two `Linking` doors are both needed and they are not interchangeable:
 * `getInitialURL` is the cold launch — the app was not running when the link
 * was tapped, which is the common case after an install — and the `url` event
 * is the warm one, an app already in the background.
 */
export const useReferrerCapture = (): void => {
  const { profile } = useAuth();
  const profileExists = profile !== null;
  // Read inside the listener rather than closed over, so a link opened at any
  // point in a session sees the profile as it is *then*. Depending on it would
  // re-subscribe and re-read the initial URL on every sign-in, counting one
  // cold launch as several link opens.
  const hasProfile = useRef(profileExists);

  useEffect(() => {
    hasProfile.current = profileExists;
  }, [ profileExists ]);

  useEffect(() => {
    let cancelled = false;

    const capture = async (url: string | null): Promise<void> => {
      if (url === null || cancelled) {
        return;
      }

      const username = referrerFromUrl(url);

      if (username === null) {
        return;
      }

      track({ name: 'referral_link_opened', params: { has_account: hasProfile.current } });

      // An account that exists has already been attributed or will never be:
      // `referred_by` is frozen after the create (docs/prd.md §4.9), so keeping
      // the handle would be keeping something nothing can read.
      if (hasProfile.current) {
        return;
      }

      await rememberPendingReferrer(username);
    };

    void Linking.getInitialURL()
      .then(capture)
      .catch((error: unknown) => {
        // Nothing here may fail a launch — the attribution falls back to being
        // typed, which is what it was before links existed.
        console.warn('[referrals] could not read the link the app was opened with', error);
      });

    const subscription = Linking.addEventListener('url', ({ url }) => void capture(url));

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, []);

  // Once a profile exists the stash can never be spent — the sheet that reads
  // it is only ever shown to an account without one. Dropped here rather than
  // left to rot, since a stale handle is what would attribute the *next*
  // account created on this phone to somebody who never invited them.
  useEffect(() => {
    if (!profileExists) {
      return;
    }

    void clearPendingReferrer();
  }, [ profileExists ]);
};
