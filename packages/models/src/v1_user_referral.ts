import {
  type FirestoreConverter,
  type ModelData,
  type UniversalTimestamp,
  parseTimestamp,
  removeMissingFields,
} from './commons';

/**
 * Sub-collection of `v1_users`, at
 * `v1_users/{user_id}/v1_user_referrals/{referred_user_id}`.
 *
 * Keeps the `v1_` prefix and its parent's name for the reason every
 * sub-collection here does: a collection group is global to the database and
 * keyed by the last path segment alone, so a bare `referrals` could not be
 * versioned on its own.
 */
export const USER_REFERRAL_COLLECTION = 'v1_user_referrals';

/**
 * One newcomer this account brought in, and what they paid — docs/prd.md §4.9.
 *
 * **Why this exists at all**, when `v1_users.referred_by` already carries the
 * link. It carries it the wrong way round: `referred_by` answers "where did
 * *this* account come from", and the screen that matters asks the opposite —
 * "who did *I* bring". Answering that off `referred_by` means a query over
 * `v1_users` filtered on it, which is a directory read in everything but name,
 * and Firestore rules cannot scope a `list` to a filter. So the sponsor's side
 * is denormalized here, one document per newcomer, readable by its owner and
 * nobody else. The same trade `v1_user_friends` makes, for the same reason.
 *
 * **Written the moment the newcomer's profile is created**, by
 * `users-onUserCreated`, and updated when the referral settles. Not written at
 * payout, which was the first shape and the wrong one: the payout waits for the
 * newcomer's first answer, so a sponsor who had genuinely brought three people
 * in would have seen « 0 filleul » for days and concluded the attribution had
 * not worked. A row that says « en attente » is the answer to "did it work",
 * and it is the whole point of the card.
 *
 * Unlike a friendship there is no mirror: the newcomer's own side of this is
 * `referred_by` on their profile, one field, which is all they need. And unlike
 * a friendship it is never deleted by a fall-out — removing somebody as a
 * friend does not un-bring them.
 */
export interface UserReferralFirebaseData {
  /** Firebase Auth UID of the sponsor — the list's owner, denormalized from the parent document's id. */
  user_id: string;
  /** Firebase Auth UID of the newcomer, same value as the document id: at most one entry per person brought in. */
  referred_user_id: string;
  /**
   * The newcomer's `username`, copied at payout time so the list costs one
   * collection read instead of one profile read per line — the same display
   * cache `v1_user_friends.friend_username` is, and as with that one
   * `v1_users/{referred_user_id}.username` stays the truth.
   *
   * Not checked against `v1_usernames` by the rules, unlike the friendship's
   * copy: nothing but the backend ever writes here, so there is no client to
   * distrust.
   */
  referred_username: string;
  /**
   * What this one referral paid the sponsor, in StatFlouzz. Zero until it
   * settles, and zero for good on one settled past `REFERRAL_MAX_REWARDED` —
   * the newcomer still counts, they just paid nothing.
   *
   * Stored rather than read off `REFERRAL_STATFLOUZZ_REWARD` at display time,
   * for the reason `v1_questions.statcoin_cost` is: the constant is what the
   * next referral will pay, not what this one did, and a reward that changes
   * would silently rewrite history.
   */
  statcoins_earned: number;
  /** When the newcomer signed up naming this account. */
  created_at: UniversalTimestamp;
  /**
   * When the referral settled — the newcomer's first real answer. Null while it
   * is still waiting, which is the state the card renders as « en attente ».
   *
   * The row's own copy of `v1_users.referral_rewarded_at`, denormalized so the
   * list costs one collection read: the sponsor cannot read the newcomer's
   * profile counters, and would not want a read per line if they could.
   */
  rewarded_at: UniversalTimestamp | null;
}

export type UserReferralData = ModelData<UserReferralFirebaseData>;

export const userReferralConverter: FirestoreConverter<UserReferralData, UserReferralFirebaseData> = (TimestampClass) => ({
  toFirestore: (data) => removeMissingFields({
    user_id: data.user_id,
    referred_user_id: data.referred_user_id,
    referred_username: data.referred_username,
    statcoins_earned: data.statcoins_earned,
    created_at: TimestampClass.fromDate(new Date(data.created_at)),
    rewarded_at: data.rewarded_at ? TimestampClass.fromDate(new Date(data.rewarded_at)) : null,
  }),
  fromFirestore: (snap) => {
    const data = snap.data();

    return {
      user_id: data.user_id ?? '',
      referred_user_id: data.referred_user_id ?? '',
      referred_username: data.referred_username ?? '',
      statcoins_earned: data.statcoins_earned ?? 0,
      created_at: parseTimestamp(data.created_at ?? null, 'now'),
      rewarded_at: parseTimestamp(data.rewarded_at ?? null),
    };
  },
});
