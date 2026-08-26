import Constants from 'expo-constants';
import { deleteDoc, getDoc, setDoc } from '@react-native-firebase/firestore';
import { Platform } from 'react-native';

import {
  DAILY_QUESTION_CHANNEL_ID,
  type DevicePlatform,
  FRIEND_INVITE_CHANNEL_ID,
  USER_COLLECTION,
  USER_DEVICE_COLLECTION,
  isExpoPushToken,
  userDeviceConverter,
} from '@statowrel/models';

import { colors } from '@/design/tokens';
import { getSubDocumentRef } from '@/lib/firestore';
import { type Notifications, loadNotifications } from '@/notifications/helpers/nativeModule';

/**
 * The token this install last wrote to Firestore, and the account it was
 * written under.
 *
 * Kept in memory so signing out can delete the right document without asking
 * the native module for the token again — and so a sign-out on a simulator,
 * where there never was a token, does nothing at all.
 */
let registered: { userId: string; token: string } | null = null;

const devicePlatform = (): DevicePlatform | null => (
  Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : null
);

/**
 * The EAS project the push token is minted for — `extra.eas.projectId` of
 * `app.config.ts`, which is what tells Expo's push service which project a
 * message posted to this token belongs to.
 *
 * `easConfig` is where a build puts it when the manifest is the one EAS Update
 * serves rather than the one Metro embeds; reading both is what makes this work
 * in a dev client and in a store build alike.
 */
const readProjectId = (): string | null => {
  const fromExtra: unknown = Constants.expoConfig?.extra?.eas?.projectId;

  if (typeof fromExtra === 'string' && fromExtra !== '') {
    return fromExtra;
  }

  const fromEasConfig: unknown = Constants.easConfig?.projectId;

  return typeof fromEasConfig === 'string' && fromEasConfig !== '' ? fromEasConfig : null;
};

/**
 * Android drops a notification naming a channel the device has not declared,
 * silently — so this runs before the token is even asked for, and it runs at
 * every launch: a channel is created once and updated for free afterwards, and
 * the backend names one of these ids on every message it sends.
 *
 * One channel per kind of interruption, because that is the granularity
 * Android gives its settings: silencing one's potes must leave the day's
 * question alone. The user can still tune each of them from the system
 * settings; what is set here is only their initial shape.
 */
const ensureAndroidChannels = async (notifications: Notifications): Promise<void> => {
  if (Platform.OS !== 'android') {
    return;
  }

  await notifications.setNotificationChannelAsync(DAILY_QUESTION_CHANNEL_ID, {
    name: 'Question du jour',
    // The drop is the whole product loop (docs/prd.md §4.2): it is worth a
    // heads-up banner, not a silent line in the shade.
    importance: notifications.AndroidImportance.HIGH,
    lightColor: colors.primary,
  });

  await notifications.setNotificationChannelAsync(FRIEND_INVITE_CHANNEL_ID, {
    name: 'Invitations',
    // An invitation waits — it is answered from the Menu whenever its owner
    // gets there (docs/prd.md §5.3), so it earns the shade, not the screen.
    importance: notifications.AndroidImportance.DEFAULT,
    lightColor: colors.primary,
  });
};

/**
 * The permission, asked at most once — and only when `ask` says this is the
 * moment for it.
 *
 * **Who raises the dialog matters more than when.** A refusal is final on both
 * platforms: `canAskAgain` is false after the first "no", and re-prompting is a
 * dialog the system would not even show. So the one place that asks is the
 * onboarding carousel's notification slide (docs/prd.md §5.6), which has just
 * said what the notification is for; every other caller — the launch
 * registration, above all — passes `ask: false` and settles for the permission
 * it finds. Turning notifications back on afterwards happens in the system
 * settings, which is where a settings screen (docs/prd.md §5.7) will eventually
 * send them.
 */
const ensurePermission = async (notifications: Notifications, ask: boolean): Promise<boolean> => {
  const current = await notifications.getPermissionsAsync();

  if (current.granted) {
    return true;
  }

  if (!ask || !current.canAskAgain) {
    return false;
  }

  const requested = await notifications.requestPermissionsAsync();

  return requested.granted;
};

/**
 * The Expo push token of this install, or null when there is none to be had —
 * a simulator, a refused permission, a build without the native module.
 *
 * Never throws: `getExpoPushTokenAsync` is what rejects on a simulator
 * ("Must use physical device for push notifications"), and on a device with no
 * network at launch. Both are ordinary, and neither is worth a broken launch.
 */
const fetchExpoPushToken = async (notifications: Notifications): Promise<string | null> => {
  const projectId = readProjectId();

  if (projectId === null) {
    console.warn('[notifications] no EAS project id in the manifest, cannot mint a push token');

    return null;
  }

  try {
    const { data: token } = await notifications.getExpoPushTokenAsync({ projectId });

    if (!isExpoPushToken(token)) {
      // The backend filters these out of its fan-out anyway
      // (`isExpoPushToken` again, in `deviceTokens.ts`); refusing to store one
      // keeps the collection clean rather than leaving it to be skipped daily.
      console.warn('[notifications] Expo returned a token of an unexpected shape');

      return null;
    }

    return token;
  } catch (error: unknown) {
    // A simulator lands here at every launch. Worth a line, never worth more.
    console.warn('[notifications] could not get an Expo push token', error);

    return null;
  }
};

/**
 * The permission dialog, raised on its own and ahead of any account — what the
 * onboarding carousel's notification slide asks for once it has said why
 * (docs/prd.md §5.6).
 *
 * Asking before there is a UID is the whole point: the alternative is the cold
 * system prompt at the first launch of a signed-in session, with nothing on
 * screen explaining what it is for, and a refusal is final on both platforms.
 * Nothing is registered here — there is no account to register under yet — but
 * `registerDeviceForPush` finds the permission already granted at sign-in and
 * goes straight to the token, so the dialog is never raised twice.
 *
 * **Never throws**, like everything else in this module: a build without the
 * native module, or a platform that has no such dialog, is « the user did not
 * grant it », not a broken carousel.
 */
export const requestPushPermission = async (): Promise<boolean> => {
  const notifications = loadNotifications();

  if (notifications === null || devicePlatform() === null) {
    return false;
  }

  try {
    await ensureAndroidChannels(notifications);

    return await ensurePermission(notifications, true);
  } catch (error: unknown) {
    console.warn('[notifications] could not ask for the push permission', error);

    return false;
  }
};

const deviceRef = (userId: string, token: string) => getSubDocumentRef(
  USER_COLLECTION,
  userId,
  USER_DEVICE_COLLECTION,
  token,
  userDeviceConverter,
);

/**
 * Registers this install as a push destination of the signed-in account —
 * `v1_users/{uid}/v1_user_devices/{push_token}`, the collection the daily
 * fan-out reads (docs/prd.md §4.2).
 *
 * Called at every launch of a signed-in session, which is what `updated_at` is
 * for: the document id is the token, so re-registering the same install is a
 * write to the same document rather than a duplicate. `created_at` is read back
 * from the existing document instead of being restamped — it is the day this
 * phone first subscribed, and a launch is not that day.
 *
 * **`ask` decides whether it may raise the permission dialog, and it defaults
 * to no.** A launch registers with whatever permission is already there; the
 * onboarding carousel's notification slide is the one caller that passes
 * `true`, after saying what the notification is for. See `ensurePermission`.
 *
 * **Never throws.** Everything it needs can legitimately be missing — the
 * native module on a stale dev client, the token on a simulator, the permission
 * on a phone whose owner said no — and none of it is worth failing a launch
 * over. The return value says what happened for a caller that cares; nobody
 * does yet.
 */
export const registerDeviceForPush = async (
  userId: string,
  { ask = false }: { ask?: boolean } = {},
): Promise<string | null> => {
  const notifications = loadNotifications();

  if (notifications === null) {
    console.warn('[notifications] expo-notifications is missing from this build');

    return null;
  }

  const platform = devicePlatform();

  if (platform === null) {
    return null;
  }

  try {
    await ensureAndroidChannels(notifications);

    if (!await ensurePermission(notifications, ask)) {
      return null;
    }

    const token = await fetchExpoPushToken(notifications);

    if (token === null) {
      return null;
    }

    const ref = deviceRef(userId, token);
    const existing = await getDoc(ref);
    const now = new Date().toISOString();

    await setDoc(ref, {
      user_id: userId,
      push_token: token,
      platform,
      created_at: existing.data()?.created_at ?? now,
      updated_at: now,
    });

    registered = { userId, token };

    return token;
  } catch (error: unknown) {
    console.warn('[notifications] could not register this device for push', error);

    return null;
  }
};

/**
 * The token this install would have registered, asked for again — the fallback
 * for a sign-out this session never registered under. Only ever asked for when
 * the permission is already granted, so this can never raise a dialog.
 */
const resolveRegisteredToken = async (): Promise<string | null> => {
  const notifications = loadNotifications();

  if (notifications === null || devicePlatform() === null) {
    return null;
  }

  return await notifications.getPermissionsAsync().then((permission) => (
    permission.granted ? fetchExpoPushToken(notifications) : null
  ));
};

/**
 * Drops this install from the account's push destinations, on the way out of
 * `signOut()` — the token belongs to a *phone*, not to an account, so leaving
 * the document behind would keep pushing the day's question to whoever holds
 * the phone next.
 *
 * The token is taken from what this session registered; failing that — a launch
 * whose registration never landed, so the document may still be there from an
 * earlier one — it is asked for again, but only when the permission is already
 * granted: a permission dialog raised by a sign-out would make no sense at all.
 *
 * **Never throws**, for the same reason `signOut` calls it before Firebase's
 * own: a device that cannot be dropped must not keep the user signed in.
 */
export const unregisterDeviceForPush = async (userId: string): Promise<void> => {
  const cached = registered?.userId === userId ? registered.token : null;

  registered = null;

  try {
    const token = cached ?? await resolveRegisteredToken();

    if (token === null) {
      return;
    }

    await deleteDoc(deviceRef(userId, token));
  } catch (error: unknown) {
    console.warn('[notifications] could not drop this device from the account', error);
  }
};
