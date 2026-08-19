import {
  type FirestoreConverter,
  type ModelData,
  type UniversalTimestamp,
  parseTimestamp,
  removeMissingFields,
} from './commons';

export const USER_COLLECTION = 'v1_users';

/**
 * Profile and answering stats of an app user — see docs/prd.md §2 and §5.
 *
 * The document id is the Firebase Auth UID, not a ULID: it is the key every
 * other collection points at (`author_id`, `user_id`, friendships) and the one
 * `firestore.rules` compares against `request.auth.uid`.
 *
 * Profile and answering stats. The rest of the PRD's `v1_users` shape
 * (`email`, `auth_providers`, `invite_code`) is still to be modelled.
 */
export interface UserFirebaseData {
  /** Pseudo, unique, chosen at first sign-in — pre-filled from the auth provider when it gives one. */
  display_name: string;
  /** Avatar. Null until the user picks one and when the provider gives none. */
  photo_url: string | null;
  created_at: UniversalTimestamp;
  /** Bumped on every profile write, so a stale client can tell it needs to refetch. */
  updated_at: UniversalTimestamp;
  /**
   * Consecutive days answered on time, shown on the Stats screen (docs/prd.md §5.2).
   *
   * Maintained by the backend, never by the app: the answer trigger bumps it,
   * the midnight scheduler resets it to 0 for whoever did not answer. A
   * catch-up answer completes the calendar but leaves this alone — the streak
   * rewards regularity, the card rewards the collection (docs/prd.md §4.6).
   */
  streak_count: number;
  /** Longest `streak_count` ever reached, shown next to the current one on the Profile screen (docs/prd.md §5.3). */
  streak_best: number;
  /** `YYYY-MM-DD` of the last on-time answer, the value `streak_count` is computed against. Null until the first one. */
  streak_last_answered_on: string | null;
}

export type UserData = ModelData<UserFirebaseData>;

export const userConverter: FirestoreConverter<UserData, UserFirebaseData> = (TimestampClass) => ({
  toFirestore: (data) => removeMissingFields({
    display_name: data.display_name,
    photo_url: data.photo_url ?? null,
    created_at: TimestampClass.fromDate(new Date(data.created_at)),
    updated_at: TimestampClass.fromDate(new Date(data.updated_at)),
    streak_count: data.streak_count,
    streak_best: data.streak_best,
    streak_last_answered_on: data.streak_last_answered_on ?? null,
  }),
  fromFirestore: (snap) => {
    const data = snap.data();

    return {
      display_name: data.display_name ?? '',
      photo_url: data.photo_url ?? null,
      created_at: parseTimestamp(data.created_at ?? null, 'now'),
      updated_at: parseTimestamp(data.updated_at ?? null, 'now'),
      streak_count: data.streak_count ?? 0,
      streak_best: data.streak_best ?? 0,
      streak_last_answered_on: data.streak_last_answered_on ?? null,
    };
  },
});
