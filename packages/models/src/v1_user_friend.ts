import {
  type FirestoreConverter,
  type ModelData,
  type UniversalTimestamp,
  parseTimestamp,
  removeMissingFields,
} from './commons';

/**
 * Sub-collection of `v1_users`, at
 * `v1_users/{user_id}/v1_user_friends/{friend_id}`.
 *
 * Like every sub-collection here it keeps the `v1_` prefix and its parent's
 * name: a collection group is global to the database and keyed by the last path
 * segment alone, so a bare `friends` could not be versioned on its own and
 * would collide with anything named the same later.
 */
export const USER_FRIEND_COLLECTION = 'v1_user_friends';

export const FRIENDSHIP_STATUSES = [ 'pending', 'accepted' ] as const;

export type FriendshipStatus = (typeof FRIENDSHIP_STATUSES)[number];

export const isFriendshipStatus = (value: string): value is FriendshipStatus => (
  (FRIENDSHIP_STATUSES as readonly string[]).includes(value)
);

/**
 * Which way an invitation was sent, as seen from the side reading it. Derived,
 * never stored: see `requested_by` below.
 */
export type FriendshipDirection = 'outgoing' | 'incoming';

/**
 * One half of a friendship — see docs/prd.md §4.1 and §6.
 *
 * A friendship is reciprocal (there is no asymmetric follow), and it is stored
 * as **two documents, one under each user**, both written from the moment the
 * invitation is sent rather than at acceptance. The mirror is what makes the
 * invitee's own list enough to show the pending invitation: without it, "who
 * invited me" would be a collection-group query over everybody's friends, and a
 * list rule loose enough to allow it would also let anyone browse who is
 * friends with whom.
 *
 * The document id is the *other* user's Firebase Auth UID. That is what makes
 * "at most one friendship per pair" a property of the path rather than a check
 * somebody has to remember: inviting the same person twice is a write to an
 * existing document, and there is no query to run to find out.
 *
 * Both halves are written in one batch by the client that acts — the inviter at
 * creation, the invitee at acceptance — under the rules in
 * `packages/firestore-config/firestore.rules`, which let a signed-in user write
 * the entry in their own list *and* the entry that carries their own UID as its
 * id, i.e. exactly the two halves of a pair they are part of. A refusal and a
 * removal are the same operation, and delete both halves: a refused invitation
 * leaves nothing behind, so re-inviting later is a fresh invitation and the
 * inviter is never shown a "declined" state.
 */
export interface UserFriendFirebaseData {
  /** Firebase Auth UID of the list's owner, denormalized from the parent document's id — the side this half is seen from. */
  user_id: string;
  /** Firebase Auth UID of the friend, same value as the document id. Carried as a field so a read never has to go back to the snapshot's path. */
  friend_id: string;
  /**
   * `pending` until the invitee accepts, `accepted` afterwards. Kept in step on
   * both halves by the batch that writes them.
   *
   * There is no `declined` nor `blocked` state: refusing deletes the pair (see
   * above), and blocking is out of scope for v1 (docs/prd.md §7).
   */
  status: FriendshipStatus;
  /**
   * Firebase Auth UID of whoever sent the invitation — **the same value on both
   * halves**, which is the point: the direction is read from it
   * (`friendshipDirectionOf`) instead of being stored per side, so the two
   * mirrors cannot end up disagreeing on who invited whom. It is also what
   * `firestore.rules` checks to reject accepting one's own invitation.
   */
  requested_by: string;
  /** When the invitation was sent. Same value on both halves. */
  created_at: UniversalTimestamp;
  /** When it was accepted. Null while `status` is `pending`. */
  accepted_at: UniversalTimestamp | null;
}

export type UserFriendData = ModelData<UserFriendFirebaseData>;

/**
 * Which way the invitation went, from the point of view of the list this entry
 * sits in — `outgoing` if that user is the one who sent it.
 */
export const friendshipDirectionOf = (
  friendship: Pick<UserFriendData, 'user_id' | 'requested_by'>,
): FriendshipDirection => (
  friendship.requested_by === friendship.user_id ? 'outgoing' : 'incoming'
);

export const userFriendConverter: FirestoreConverter<UserFriendData, UserFriendFirebaseData> = (TimestampClass) => ({
  toFirestore: (data) => removeMissingFields({
    user_id: data.user_id,
    friend_id: data.friend_id,
    status: data.status,
    requested_by: data.requested_by,
    created_at: TimestampClass.fromDate(new Date(data.created_at)),
    accepted_at: data.accepted_at ? TimestampClass.fromDate(new Date(data.accepted_at)) : null,
  }),
  fromFirestore: (snap) => {
    const data = snap.data();

    return {
      user_id: data.user_id ?? '',
      friend_id: data.friend_id ?? '',
      status: typeof data.status === 'string' && isFriendshipStatus(data.status) ? data.status : 'pending',
      requested_by: data.requested_by ?? '',
      created_at: parseTimestamp(data.created_at ?? null, 'now'),
      accepted_at: parseTimestamp(data.accepted_at ?? null),
    };
  },
});
