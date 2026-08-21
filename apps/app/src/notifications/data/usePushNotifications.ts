import type { NotificationResponse } from 'expo-notifications';
import { useEffect, useRef } from 'react';

import { useAuth } from '@/auth/AuthContext';
import { registerDeviceForPush } from '@/notifications/data/deviceRegistration';
import { loadNotifications } from '@/notifications/helpers/nativeModule';
import { openDailyQuestion } from '@/notifications/helpers/openDailyQuestion';
import { parseDailyQuestionRoute } from '@/notifications/helpers/pushRoute';

/*
 * What to do with a notification that arrives while the app is open.
 *
 * Without a handler `expo-notifications` shows nothing in the foreground, and
 * the 07:00 drop would be invisible to whoever already has the app in front of
 * them. The badge is left alone: nothing in the app counts anything on the icon.
 *
 * Set at module scope, as the module requires — a handler registered from an
 * effect misses the notification that arrives during that first render.
 */
loadNotifications()?.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * The app's whole notification wiring, mounted once from `src/App.tsx`:
 * registering this install as a push destination, and opening the day a tapped
 * notification points at.
 *
 * Both hang off the session — `useAuth()` rather than a subscription of its own
 * — because both need a UID: the token is stored under the account, and
 * `DailyQuestion` is only a route while somebody is signed in (the signed-out
 * half of the stack does not register it). Signing in registers, signing out
 * unregisters from `signOut()` itself, where the write can still be made in the
 * user's name.
 *
 * Nothing here is allowed to block or fail a launch: the registration swallows
 * its own errors, and a build without the native module simply does none of it.
 */
export const usePushNotifications = (): void => {
  const { user } = useAuth();
  const userId = user?.uid ?? null;
  // A tap that launched the app is read twice — once from the cold-start
  // response below, once from the listener, which fires for it too on Android.
  // Opening the sheet twice would stack two of them.
  const handled = useRef(new Set<string>());

  useEffect(() => {
    if (userId === null) {
      return;
    }

    void registerDeviceForPush(userId);
  }, [ userId ]);

  useEffect(() => {
    if (userId === null) {
      return undefined;
    }

    const notifications = loadNotifications();

    if (notifications === null) {
      return undefined;
    }

    const seen = handled.current;

    const open = (response: NotificationResponse) => {
      const { identifier, content } = response.notification.request;

      if (seen.has(identifier)) {
        return;
      }

      seen.add(identifier);

      const date = parseDailyQuestionRoute(content.data);

      if (date !== null) {
        openDailyQuestion(date);
      }
    };

    // The tap that launched the app, if that is how it was launched. It is read
    // here rather than left to the listener: the listener is subscribed after
    // the native side has already delivered it.
    notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response !== null) {
          open(response);
        }
      })
      .catch((error: unknown) => {
        console.warn('[notifications] could not read the notification that launched the app', error);
      });

    const subscription = notifications.addNotificationResponseReceivedListener(open);

    return () => subscription.remove();
  }, [ userId ]);
};
