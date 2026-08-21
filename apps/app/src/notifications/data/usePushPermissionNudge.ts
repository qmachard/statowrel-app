import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';

import { useAuth } from '@/auth/AuthContext';
import { registerDeviceForPush, requestPushPermission } from '@/notifications/data/deviceRegistration';
import { openNotificationSettings, readPushPermission } from '@/notifications/data/pushPermission';

/**
 * Versioned like the carousel's own flag, and on the device rather than on the
 * account for the same reason: a permission belongs to a phone. Signing in on a
 * second phone is a phone that has never been asked.
 */
const STORAGE_KEY = 'statowrel.notifications.nudge.v1';

/**
 * Long enough for the splash screen to be gone and the Stats screen to be the
 * thing behind the alert. A dialog over a screen nobody has read yet is a
 * dialog answered « plus tard » without being read either.
 */
const DELAY_MS = 1200;

const COPY = {
  askable: {
    title: 'Tu vas rater la question du jour',
    body: 'Une notification le matin quand la question tombe, un rappel le soir si tu ne l’as pas vue, et un mot quand un pote t’ajoute. Rien de plus.',
    action: 'Activer',
  },
  blocked: {
    title: 'Tes notifications sont coupées',
    body: 'StatOwrel ne peut plus te prévenir quand la question du jour tombe. Ça se réactive en deux taps dans les réglages de ton téléphone.',
    action: 'Ouvrir les réglages',
  },
};

/**
 * The one thing missing from `requestPushPermission`: a way of reaching
 * somebody who is **already signed in**.
 *
 * The permission is asked by the onboarding carousel's notification slide
 * (docs/prd.md §5.6), which only ever runs on a fresh install — so an account
 * created before that slide existed, or one whose owner tapped « Passer », goes
 * on for good with no dialog ever raised and no daily banner. This is the
 * catch-up: once per install, after the session and the profile have resolved,
 * a pre-prompt saying what the notification is for, and only then the system's
 * own — or the settings, when the system dialog is already spent.
 *
 * A native `Alert` rather than a sheet of our own, the same call as the account
 * deletion in the Menu: it is the dialog both systems have taught their users
 * to read, and putting our own in front of the system's would make three
 * dialogs in a row.
 *
 * **Asked once and never again.** The flag is written the moment the alert goes
 * up, whatever the answer: « plus tard » is an answer, and the permanent way in
 * is the Menu's own button (`NotificationsButton`). Somebody who already
 * granted it is never nudged, and the flag stays unwritten for them — a
 * permission revoked later still gets its one alert.
 */
export const usePushPermissionNudge = (): void => {
  const { user, profile } = useAuth();
  const userId = user?.uid ?? null;
  // Guards the alert against a re-render, and against the profile subscription
  // handing over a second value while the dialog is up.
  const nudged = useRef(false);

  useEffect(() => {
    // The profile is what says the username sheet is behind us: nudging over a
    // blocking sheet would ask for a permission the app has not earned yet.
    if (userId === null || profile === null || nudged.current) {
      return undefined;
    }

    let cancelled = false;

    const ask = async () => {
      const [ state, seen ] = await Promise.all([
        readPushPermission(),
        AsyncStorage.getItem(STORAGE_KEY),
      ]);

      // `granted` needs nothing, `unavailable` has nothing to offer, and a
      // phone already nudged is not nudged twice.
      if (cancelled || seen !== null || (state !== 'askable' && state !== 'blocked')) {
        return;
      }

      nudged.current = true;

      // Written before the answer, not after: an alert dismissed by a phone
      // call is an alert that was shown.
      await AsyncStorage.setItem(STORAGE_KEY, new Date().toISOString());

      const copy = COPY[state];

      Alert.alert(copy.title, copy.body, [
        { text: 'Plus tard', style: 'cancel' },
        {
          text: copy.action,
          onPress: () => {
            if (state === 'blocked') {
              void openNotificationSettings();

              return;
            }

            // The token only exists once the permission does, and the account
            // is right here — no need to wait for the next launch's
            // registration.
            void requestPushPermission().then((granted) => (
              granted ? registerDeviceForPush(userId) : null
            ));
          },
        },
      ]);
    };

    const timer = setTimeout(() => {
      ask().catch((error: unknown) => {
        console.warn('[notifications] could not offer to turn the notifications on', error);
      });
    }, DELAY_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [ userId, profile ]);
};
