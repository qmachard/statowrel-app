import {
  type FirestoreConverter,
  type ModelData,
  type UniversalTimestamp,
  parseTimestamp,
  removeMissingFields,
} from './commons';

/**
 * Sub-collection of `v1_users`, at
 * `v1_users/{user_id}/v1_user_devices/{push_token}`.
 *
 * Like every sub-collection here it keeps the `v1_` prefix and its parent's
 * name: a collection group is global to the database and keyed by the last path
 * segment alone, so a bare `devices` could not be versioned on its own.
 */
export const USER_DEVICE_COLLECTION = 'v1_user_devices';

export const DEVICE_PLATFORMS = [ 'ios', 'android' ] as const;

export type DevicePlatform = (typeof DEVICE_PLATFORMS)[number];

export const isDevicePlatform = (value: string): value is DevicePlatform => (
  (DEVICE_PLATFORMS as readonly string[]).includes(value)
);

/**
 * Shape of an Expo push token — `ExponentPushToken[…]`, the form
 * `getExpoPushTokenAsync()` returns. Checked on both sides: the app never
 * stores anything else, and the backend never posts anything else to Expo,
 * which rejects the whole batch a malformed token sits in.
 */
export const EXPO_PUSH_TOKEN_PATTERN = /^Expo(nent)?PushToken\[[^\s[\]]+\]$/;

export const isExpoPushToken = (value: string): boolean => EXPO_PUSH_TOKEN_PATTERN.test(value);

/**
 * Android notification channel the day's question is posted in.
 *
 * Android drops a notification naming a channel the device has not declared,
 * so the app creates it at registration and the backend names it on every
 * message. It lives here, next to the token, because it is the one other thing
 * both sides have to spell identically — and this package is the only place
 * they share.
 */
export const DAILY_QUESTION_CHANNEL_ID = 'daily-question';

/**
 * Android notification channel a received friend invitation is posted in
 * (docs/prd.md §4.1).
 *
 * Its own channel rather than the day's: they are two unrelated interruptions,
 * and Android's settings are per channel — somebody silencing their potes'
 * invitations must not silence the question along with them.
 */
export const FRIEND_INVITE_CHANNEL_ID = 'friend-invite';

/**
 * One push destination of one account — the device the day's question is
 * pushed to at 07:00 (docs/prd.md §4.2).
 *
 * **The document id is the push token itself.** Re-registering the same
 * install is then a write to the same document rather than a duplicate nobody
 * queries for, which is the same trick `v1_usernames` and `v1_user_friends`
 * use: the uniqueness lives in the path. The token is carried as a field too,
 * so a read never has to go back to the snapshot's path — and so
 * `firestore.rules` can check the two agree.
 *
 * The token belongs to an *install*, not to an account: signing out deletes
 * this document, otherwise the previous account would keep pushing to a phone
 * somebody else now holds. A token the backend finds dead — Expo answering
 * `DeviceNotRegistered` — is deleted the same way, from the fan-out.
 *
 * Notification preferences (docs/prd.md §5.6) are not modelled here yet: there
 * is no settings screen to set them from. When they arrive they belong to the
 * account, not to the device — one choice, however many phones.
 */
export interface UserDeviceFirebaseData {
  /** Firebase Auth UID of the device's owner, denormalized from the parent document's id. */
  user_id: string;
  /** Expo push token, same value as the document id. `EXPO_PUSH_TOKEN_PATTERN`-shaped. */
  push_token: string;
  /** What the push has to be formatted for — Android needs its channel, iOS its sound. */
  platform: DevicePlatform;
  created_at: UniversalTimestamp;
  /**
   * Refreshed at every registration, i.e. at every launch of a signed-in
   * session. A token Expo has not invalidated but that nothing has refreshed
   * for months is what an eventual clean-up would age out.
   */
  updated_at: UniversalTimestamp;
}

export type UserDeviceData = ModelData<UserDeviceFirebaseData>;

export const userDeviceConverter: FirestoreConverter<UserDeviceData, UserDeviceFirebaseData> = (TimestampClass) => ({
  toFirestore: (data) => removeMissingFields({
    user_id: data.user_id,
    push_token: data.push_token,
    platform: data.platform,
    created_at: TimestampClass.fromDate(new Date(data.created_at)),
    updated_at: TimestampClass.fromDate(new Date(data.updated_at)),
  }),
  fromFirestore: (snap) => {
    const data = snap.data();

    return {
      user_id: data.user_id ?? '',
      push_token: data.push_token ?? '',
      platform: typeof data.platform === 'string' && isDevicePlatform(data.platform) ? data.platform : 'android',
      created_at: parseTimestamp(data.created_at ?? null, 'now'),
      updated_at: parseTimestamp(data.updated_at ?? null, 'now'),
    };
  },
});
