import { Linking } from 'react-native';

import { loadNotifications } from '@/notifications/helpers/nativeModule';

/**
 * Where this phone stands on notifications, in the only four states the app
 * has anything different to do about:
 *
 * - `granted` — nothing to ask, the token is registered at the next launch of a
 *   signed-in session (`registerDeviceForPush`);
 * - `askable` — the system dialog has never been raised (or was postponed on
 *   Android), so asking still shows something;
 * - `blocked` — `canAskAgain` is false: the dialog would not even appear, and
 *   the only way back is the system settings;
 * - `unavailable` — a simulator, or a build without the native module. Nothing
 *   to ask and nothing to offer, so whatever offers it renders nothing.
 *
 * `blocked` is what the app was missing: the permission was asked once, in the
 * onboarding carousel (docs/prd.md §5.6), by whoever was installing the app
 * that day — everybody already signed in when that slide shipped never saw it,
 * and nothing else in the app ever asked again.
 */
export type PushPermissionState = 'unavailable' | 'granted' | 'askable' | 'blocked';

/**
 * Reads the permission without ever raising a dialog — `getPermissionsAsync`
 * only reports, `requestPermissionsAsync` is what asks.
 *
 * **Never throws**, like everything else in this domain: a permission that
 * cannot be read is « there is nothing to offer here », not a broken screen.
 */
export const readPushPermission = async (): Promise<PushPermissionState> => {
  const notifications = loadNotifications();

  if (notifications === null) {
    return 'unavailable';
  }

  try {
    const permission = await notifications.getPermissionsAsync();

    if (permission.granted) {
      return 'granted';
    }

    return permission.canAskAgain ? 'askable' : 'blocked';
  } catch (error: unknown) {
    console.warn('[notifications] could not read the push permission', error);

    return 'unavailable';
  }
};

/**
 * The app's own page in the system settings — the only way to turn a refused
 * permission back on, on both platforms, since the dialog is spent.
 *
 * Whoever comes back from there lands on an `AppState` change, which is where
 * `usePushPermission` re-reads the permission and registers the device.
 */
export const openNotificationSettings = async (): Promise<void> => {
  try {
    await Linking.openSettings();
  } catch (error: unknown) {
    console.warn('[notifications] could not open the system settings', error);
  }
};
