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
 * What one calendar month of a pair agreed on — the unit the score is
 * accumulated in.
 *
 * A month rather than a day because that is the grain the source is already
 * stored at: `v1_user_calendar_months` holds one document per user per month,
 * so a month is what a single read either side costs. It is also the unit that
 * makes the accumulation **idempotent** — a month is recomputed whole from the
 * two calendar documents, never incremented, so recomputing one twice writes
 * the same two numbers.
 */
export interface FriendCompatibilityMonthFirebaseData {
  /** Days of that month both answered, jokers excluded on either side. */
  common_days: number;
  /** Of those days, the ones where both picked the same option. */
  matching_days: number;
}

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
 * the calendar months, so a document lost or wrong is a document rebuilt on the
 * next open.
 *
 * The cache is keyed on `computed_on` rather than on `computed_at`: the score
 * can only move when a new day is answered, and a day is a Paris day
 * (`dailyQuestionDateKey`). One recompute per pair per day, whoever opens the
 * profile first and however many times either of them opens it after that.
 *
 * **And a recompute is a diff, not a rebuild.** `months` plus `synced_at` are
 * what keep the read cost flat as the two histories grow: only the months that
 * moved since the last pass are read again. See those two fields.
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
   *
   * The sum of `months`, materialized here so a reader gets the total without
   * having to add the map up — `compatibilityTotalsOf` is what builds both.
   */
  common_days: number;
  /** Of those days, the ones where both picked the same option. Sum of `months`, like `common_days`. */
  matching_days: number;
  /** `matching_days / common_days` as a whole percentage — `compatibilityScoreOf`. */
  score: number;
  /**
   * The tally cut by calendar month, keyed `YYYY-MM` — the whole reason a
   * recompute is cheap.
   *
   * Without it every open of a friend's profile re-read both accounts' entire
   * histories, and one's own history was re-read once per friend consulted in
   * the day: at twelve months and ten friends that is the app's first read
   * post. With it, a recompute reads only the months that moved since
   * `synced_at` and folds them into this map, so the cost stops depending on
   * how old the two accounts are.
   *
   * A month is stored only while it holds something: a month the two never
   * shared a day in is absent rather than a pair of zeroes.
   */
  months: Record<string, FriendCompatibilityMonthFirebaseData>;
  /** `YYYY-MM-DD` Paris day the score was last computed on. The cache key: a score computed today is served as is. */
  computed_on: string;
  computed_at: UniversalTimestamp;
  /**
   * How far the diff has been walked — every calendar month of either side
   * whose `updated_at` is at or before this instant is already folded into
   * `months`.
   *
   * Null on a document written before this field existed, which is what asks
   * the next recompute for a full pass — the same thing a brand new pair gets.
   *
   * It is stamped **behind** the moment the reads started, by a margin, because
   * a calendar month's `updated_at` is taken by its writer before that write
   * commits: an instant of overlap is what stops a month from slipping between
   * two passes. Re-reading a month costs two documents and changes nothing,
   * months being recomputed whole rather than incremented.
   */
  synced_at: UniversalTimestamp | null;
}

export type FriendCompatibilityMonthData = ModelData<FriendCompatibilityMonthFirebaseData>;

export type FriendCompatibilityData = ModelData<FriendCompatibilityFirebaseData>;

/**
 * The three numbers a map of months adds up to — what the pair document
 * carries alongside the map itself.
 *
 * Months with nothing in them are dropped on the way out, so the stored map
 * stays the list of months the two actually shared a day in.
 */
export const compatibilityTotalsOf = (
  months: Record<string, FriendCompatibilityMonthData>,
): Pick<FriendCompatibilityData, 'common_days' | 'matching_days' | 'score' | 'months'> => {
  // Built by reduce, not by indexing: `noUncheckedIndexedAccess` is on in this package.
  const kept = Object.entries(months).reduce<Record<string, FriendCompatibilityMonthData>>((acc, [ monthKey, month ]) => {
    if (month.common_days > 0) {
      acc[monthKey] = month;
    }

    return acc;
  }, {});

  const commonDays = Object.values(kept).reduce((total, month) => total + month.common_days, 0);
  const matchingDays = Object.values(kept).reduce((total, month) => total + month.matching_days, 0);

  return {
    common_days: commonDays,
    matching_days: matchingDays,
    score: compatibilityScoreOf(matchingDays, commonDays),
    months: kept,
  };
};

const parseMonths = (
  months: Record<string, Partial<FriendCompatibilityMonthFirebaseData>> | null | undefined,
): Record<string, FriendCompatibilityMonthData> => (
  // Built by reduce, not by indexing: `noUncheckedIndexedAccess` is on in this package.
  Object.entries(months ?? {}).reduce<Record<string, FriendCompatibilityMonthData>>((acc, [ monthKey, month ]) => {
    if (typeof month?.common_days === 'number' && month.common_days > 0) {
      acc[monthKey] = {
        common_days: month.common_days,
        matching_days: month.matching_days ?? 0,
      };
    }

    return acc;
  }, {})
);

export const friendCompatibilityConverter: FirestoreConverter<FriendCompatibilityData, FriendCompatibilityFirebaseData> = (TimestampClass) => ({
  toFirestore: (data) => removeMissingFields({
    user_ids: data.user_ids,
    common_days: data.common_days,
    matching_days: data.matching_days,
    score: data.score,
    months: parseMonths(data.months),
    computed_on: data.computed_on,
    computed_at: TimestampClass.fromDate(new Date(data.computed_at)),
    synced_at: data.synced_at ? TimestampClass.fromDate(new Date(data.synced_at)) : null,
  }),
  fromFirestore: (snap) => {
    const data = snap.data();

    return {
      user_ids: Array.isArray(data.user_ids) ? data.user_ids.filter((id): id is string => typeof id === 'string') : [],
      common_days: data.common_days ?? 0,
      matching_days: data.matching_days ?? 0,
      score: data.score ?? 0,
      months: parseMonths(data.months),
      computed_on: data.computed_on ?? '',
      computed_at: parseTimestamp(data.computed_at ?? null, 'now'),
      synced_at: parseTimestamp(data.synced_at ?? null),
    };
  },
});
