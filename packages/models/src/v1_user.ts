import {
  type FirestoreConverter,
  type ModelData,
  type UniversalTimestamp,
  parseTimestamp,
  removeMissingFields,
} from './commons';

export const USER_COLLECTION = 'v1_users';

/**
 * Profile of an app user — see docs/prd.md §2 and §5.
 *
 * The document id is the Firebase Auth UID, not a ULID: it is the key every
 * other collection points at (`author_id`, `user_id`, friendships) and the one
 * `firestore.rules` compares against `request.auth.uid`.
 *
 * This is the profile slice only. The rest of the PRD's `v1_users` shape
 * (`email`, `auth_providers`, `streak_count`, `streak_last_answered_on`,
 * `invite_code`) is still to be modelled.
 */
export interface UserFirebaseData {
  /** Pseudo, unique, chosen at first sign-in — pre-filled from the auth provider when it gives one. */
  display_name: string;
  /** Avatar. Null until the user picks one and when the provider gives none. */
  photo_url: string | null;
  created_at: UniversalTimestamp;
  /** Bumped on every profile write, so a stale client can tell it needs to refetch. */
  updated_at: UniversalTimestamp;
}

export type UserData = ModelData<UserFirebaseData>;

export const userConverter: FirestoreConverter<UserData, UserFirebaseData> = (TimestampClass) => ({
  toFirestore: (data) => removeMissingFields({
    display_name: data.display_name,
    photo_url: data.photo_url ?? null,
    created_at: TimestampClass.fromDate(new Date(data.created_at)),
    updated_at: TimestampClass.fromDate(new Date(data.updated_at)),
  }),
  fromFirestore: (snap) => {
    const data = snap.data();

    return {
      display_name: data.display_name ?? '',
      photo_url: data.photo_url ?? null,
      created_at: parseTimestamp(data.created_at ?? null, 'now'),
      updated_at: parseTimestamp(data.updated_at ?? null, 'now'),
    };
  },
});
