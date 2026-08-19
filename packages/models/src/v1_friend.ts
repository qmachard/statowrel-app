import {
  type FirestoreConverter,
  type ModelData,
  type UniversalTimestamp,
  parseTimestamp,
  removeMissingFields,
} from './commons';

export const FRIEND_SUBCOLLECTION = 'friends';

/**
 * One friendship, stored under `v1_users/{user_id}/friends` — see docs/prd.md
 * §4.1 and §6.
 *
 * The document id is the friend's Firebase Auth UID, so a friendship can be
 * read and removed without a query. A friendship is reciprocal: accepting an
 * invitation writes the entry on both sides.
 *
 * Nothing about the friend is denormalised here — the list screen reads
 * `v1_users/{friend_id}` for the pseudo, the avatar and (later) the streak, so
 * a profile edit never leaves a stale copy behind.
 */
export interface FriendFirebaseData {
  /** The friend's UID — same value as the document id, kept as a field so collection-group queries can filter on it. */
  friend_id: string;
  created_at: UniversalTimestamp;
}

export type FriendData = ModelData<FriendFirebaseData>;

export const friendConverter: FirestoreConverter<FriendData, FriendFirebaseData> = (TimestampClass) => ({
  toFirestore: (data) => removeMissingFields({
    friend_id: data.friend_id,
    created_at: TimestampClass.fromDate(new Date(data.created_at)),
  }),
  fromFirestore: (snap) => {
    const data = snap.data();

    return {
      friend_id: data.friend_id ?? snap.id,
      created_at: parseTimestamp(data.created_at ?? null, 'now'),
    };
  },
});
