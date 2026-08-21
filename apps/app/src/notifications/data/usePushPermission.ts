import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/auth/AuthContext';
import { registerDeviceForPush, requestPushPermission } from '@/notifications/data/deviceRegistration';
import { type PushPermissionState, openNotificationSettings, readPushPermission } from '@/notifications/data/pushPermission';

export interface PushPermission {
  /** Null until the permission has been read — nothing is offered before that. */
  state: PushPermissionState | null;
  /** True while the dialog is up, or while the settings are being opened. */
  busy: boolean;
  /**
   * Asks for the permission, or hands over to the system settings when the
   * dialog is spent. A no-op once it is granted.
   */
  enable: () => void;
}

/**
 * The permission as a screen can use it: its state, kept in step with the
 * system's own, and the one action that moves it forward.
 *
 * It re-reads on every return to the foreground, which is what makes the
 * settings round-trip work: the switch is flipped in the system settings, the
 * app comes back, the state follows — and the effect below registers the device
 * on the spot rather than at the next cold launch.
 *
 * Registering here is deliberate. `registerDeviceForPush` runs at every launch
 * of a signed-in session (`usePushNotifications`), but a permission granted
 * *during* a session would otherwise leave the account with no token until the
 * app was killed and reopened — that is a day of notifications lost to a launch
 * nobody thinks to perform. The write is idempotent (the document id is the
 * token), so doing it twice costs one `updated_at`.
 */
export const usePushPermission = (): PushPermission => {
  const { user } = useAuth();
  const userId = user?.uid ?? null;

  const [ state, setState ] = useState<PushPermissionState | null>(null);
  const [ busy, setBusy ] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const read = () => {
      readPushPermission()
        .then((next) => {
          if (!cancelled) {
            setState(next);
          }
        })
        .catch((error: unknown) => {
          console.warn('[notifications] could not refresh the push permission', error);
        });
    };

    read();

    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') {
        read();
      }
    });

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (state !== 'granted' || userId === null) {
      return;
    }

    void registerDeviceForPush(userId);
  }, [ state, userId ]);

  const enable = useCallback(() => {
    if (state === null || state === 'granted' || state === 'unavailable') {
      return;
    }

    setBusy(true);

    // A blocked permission is not asked again — the system would show nothing
    // at all. The settings are the only door left, and the `AppState` listener
    // above is what notices it was used.
    const act = state === 'blocked'
      ? openNotificationSettings()
      : requestPushPermission().then(() => undefined);

    act
      .then(() => readPushPermission())
      .then(setState)
      .catch((error: unknown) => {
        console.warn('[notifications] could not enable the notifications', error);
      })
      .finally(() => setBusy(false));
  }, [ state ]);

  return { state, busy, enable };
};
