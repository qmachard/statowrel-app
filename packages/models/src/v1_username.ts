import {
  type FirestoreConverter,
  type ModelData,
  type UniversalTimestamp,
  parseTimestamp,
  removeMissingFields,
} from './commons';

export const USERNAME_COLLECTION = 'v1_usernames';

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;

/**
 * Lowercase letters, digits, dot and underscore, opening and closing on an
 * alphanumeric — an Instagram handle, minus the case.
 *
 * `firestore.rules` carries this expression a second time, by hand: rules
 * cannot import JavaScript. The two must be changed together.
 */
export const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._]{1,18}[a-z0-9]$/;

/** A username is compared, stored and looked up in one single form. */
export const normalizeUsername = (value: string): string => value.trim().toLowerCase();

export const isValidUsername = (value: string): boolean => USERNAME_PATTERN.test(value);

/**
 * One document per taken username, the document id being the username itself
 * — see docs/prd.md §4.1.
 *
 * Uniqueness is a property of the path rather than a check to run: Firestore
 * denies a `create` on a document that already exists, so two people racing for
 * the same handle cannot both win, with no query and no transaction. It is also
 * how a username resolves to an account when a friend is added by handle.
 */
export interface UsernameFirebaseData {
  /** Firebase Auth UID of the account holding it — the id of its `v1_users` document. */
  user_id: string;
  created_at: UniversalTimestamp;
}

export type UsernameData = ModelData<UsernameFirebaseData>;

export const usernameConverter: FirestoreConverter<UsernameData, UsernameFirebaseData> = (TimestampClass) => ({
  toFirestore: (data) => removeMissingFields({
    user_id: data.user_id,
    created_at: TimestampClass.fromDate(new Date(data.created_at)),
  }),
  fromFirestore: (snap) => {
    const data = snap.data();

    return {
      user_id: data.user_id ?? '',
      created_at: parseTimestamp(data.created_at ?? null, 'now'),
    };
  },
});
