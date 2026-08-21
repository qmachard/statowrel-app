import type * as NotificationsModule from 'expo-notifications';

export type Notifications = typeof NotificationsModule;

/**
 * `expo-notifications` is a native module: importing it at module scope throws
 * on a binary built before it was added — a stale dev client, most often. The
 * hook that drives it is mounted at the root of the app (`src/App.tsx`), so
 * unlike the auth providers' modules that throw would take the whole launch
 * down rather than one button.
 *
 * Same lazy require as `src/auth/nativeModules.ts`, for the same reason: the
 * failure stays where it belongs, and the app runs without notifications.
 */
export const loadNotifications = (): Notifications | null => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-notifications') as Notifications;
  } catch {
    return null;
  }
};
