import {
  type FirestoreConverter,
  type ModelData,
  type UniversalTimestamp,
  parseTimestamp,
  removeMissingFields,
} from './commons';

/**
 * Top-level collection, at `v1_friend_compatibilities/{pair_id}`.
 *
 * One document per **pair**, not per side — unlike `v1_user_friends`, which is
 * mirrored under both users. A compatibility is symmetric by construction (the
 * same days, the same picks, read from either end), so two mirrored halves
 * would be two copies of one number, kept in step by nobody.
 */
export const FRIEND_COMPATIBILITY_COLLECTION = 'v1_friend_compatibilities';

/**
 * How far back the score looks, in answers per side.
 *
 * A window rather than the whole history: the two collection-group queries the
 * callable runs are what the score costs, and an account answering every day
 * takes three years to reach this. Big enough that nobody sees the edge, small
 * enough that the read is bounded whatever the app's age.
 */
export const COMPATIBILITY_WINDOW = 1000;

/**
 * Below this many days answered in common, no score is shown at all — see
 * `FriendCompatibilityFirebaseData.common_days`.
 *
 * One shared day and one identical pick is 100 %, which is not a statistic, it
 * is a coincidence dressed as one. The app says how many days are still
 * missing instead.
 */
export const COMPATIBILITY_MIN_COMMON_DAYS = 5;

/**
 * The document id of a pair — the two UIDs sorted and joined, so both sides
 * compute the same one without having to agree on an order first.
 *
 * That is what makes « at most one score per pair » a property of the path
 * rather than a check to run, the same way the friendship's own id is the other
 * user's UID (`v1_user_friend.ts`) and a reserved handle is its own document
 * id (`v1_username.ts`).
 */
export const friendCompatibilityId = (userId: string, friendId: string): string => (
  [ userId, friendId ].sort().join('__')
);

/**
 * The score itself, as a whole percentage. Zero common days is zero rather than
 * a division by nothing — the caller is expected to check
 * `COMPATIBILITY_MIN_COMMON_DAYS` before showing anything at all.
 */
export const compatibilityScoreOf = (matchingDays: number, commonDays: number): number => (
  commonDays === 0 ? 0 : Math.round((matchingDays / commonDays) * 100)
);

/**
 * How alike two friends answered — docs/prd.md §5.3.
 *
 * **A raw agreement rate**, deliberately: identical picks over days both
 * answered, and nothing else. Correcting for the number of options each
 * question offered would be more honest statistically and unreadable
 * socially — the number is there to be said out loud (« on est compatibles à
 * 72 % »), and a score nobody can explain is a score nobody quotes.
 *
 * **Written by the backend alone** (`friends-getFriendCompatibility`), and read
 * by both members of the pair — `firestore.rules` checks `user_ids` for
 * membership, which is the one thing a rule can check without a `get()` on the
 * friendship. It is a cache, not a source: everything here is recomputed from
 * the answers, so a document lost or wrong is a document rebuilt on the next
 * open.
 *
 * The cache is keyed on `computed_on` rather than on `computed_at`: the score
 * can only move when a new day is answered, and a day is a Paris day
 * (`dailyQuestionDateKey`). One recompute per pair per day, whoever opens the
 * profile first and however many times either of them opens it after that.
 */
export interface FriendCompatibilityFirebaseData {
  /**
   * The two Firebase Auth UIDs, sorted — the same order the document id is
   * built from.
   *
   * Carried as a field and not only in the id because `firestore.rules` cannot
   * split a string: membership is checked with `request.auth.uid in
   * resource.data.user_ids`, which is what keeps a third party out of a score
   * they are not part of.
   */
  user_ids: string[];
  /**
   * Days both answered the same question, jokers excluded on either side.
   *
   * A joker is « done » for the streak and for the friends' badge (docs/prd.md
   * §4.8) but it picked nothing, so it is not an opinion to agree or disagree
   * with. The onboarding demo is excluded too — it was never a day, and
   * everybody answers it.
   */
  common_days: number;
  /** Of those days, the ones where both picked the same option. */
  matching_days: number;
  /** `matching_days / common_days` as a whole percentage — `compatibilityScoreOf`. */
  score: number;
  /** `YYYY-MM-DD` Paris day the score was last computed on. The cache key: a score computed today is served as is. */
  computed_on: string;
  computed_at: UniversalTimestamp;
}

export type FriendCompatibilityData = ModelData<FriendCompatibilityFirebaseData>;

export const friendCompatibilityConverter: FirestoreConverter<FriendCompatibilityData, FriendCompatibilityFirebaseData> = (TimestampClass) => ({
  toFirestore: (data) => removeMissingFields({
    user_ids: data.user_ids,
    common_days: data.common_days,
    matching_days: data.matching_days,
    score: data.score,
    computed_on: data.computed_on,
    computed_at: TimestampClass.fromDate(new Date(data.computed_at)),
  }),
  fromFirestore: (snap) => {
    const data = snap.data();

    return {
      user_ids: Array.isArray(data.user_ids) ? data.user_ids.filter((id): id is string => typeof id === 'string') : [],
      common_days: data.common_days ?? 0,
      matching_days: data.matching_days ?? 0,
      score: data.score ?? 0,
      computed_on: data.computed_on ?? '',
      computed_at: parseTimestamp(data.computed_at ?? null, 'now'),
    };
  },
});
