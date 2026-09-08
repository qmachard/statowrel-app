import {
  type FriendCompatibilityMonthData,
  USER_CALENDAR_MONTH_COLLECTION,
  USER_COLLECTION,
  type UserCalendarMonthData,
  userCalendarMonthConverter,
  userConverter,
} from '@statowrel/models';
import { Timestamp } from 'firebase-admin/firestore';

import {
  getDocumentRef,
  getSubCollectionRef,
  getSubDocumentRef,
  parseData,
} from '@/libs/firebase-admin';

/**
 * How far behind the reads a pass stamps its own cursor.
 *
 * A calendar month's `updated_at` is taken by its writer a moment before that
 * write commits, so a month written in the same breath as this pass could carry
 * a stamp this pass has already walked past. The margin is what stops it from
 * falling between two passes — and it costs nothing, since re-reading a month
 * recomputes it whole and writes the same two numbers back.
 */
export const COMPATIBILITY_SYNC_MARGIN_MS = 5 * 60 * 1000;

/** What one pass folded in: the months it recomputed, and how far it walked. */
export interface CompatibilityDiff {
  /** The recomputed months, keyed `YYYY-MM` — whole tallies, to be merged over the stored ones. */
  months: Record<string, FriendCompatibilityMonthData>;
  /** The cursor the next pass starts from, already set back by `COMPATIBILITY_SYNC_MARGIN_MS`. */
  synced_at: string;
}

const calendarMonthsOf = (userId: string) => getSubCollectionRef(
  getDocumentRef(USER_COLLECTION, userId, userConverter),
  USER_CALENDAR_MONTH_COLLECTION,
  userCalendarMonthConverter,
);

/**
 * The months of one account that moved since `since` — its whole calendar when
 * that is null, which is what a pair computed for the first time gets.
 *
 * `updated_at` is bumped by three writers: the account's own day, its own
 * joker, and every friend's badge count. Only the first two can move a score,
 * so this over-reads — a friend answering makes the current month look changed
 * on both sides of a pair that did nothing. Deliberately: over-reading a month
 * costs two documents and recomputes the same two numbers, while a narrower
 * stamp only one writer maintains is a stamp somebody forgets to bump, and a
 * missed month is a score silently wrong for good.
 */
const changedMonthsOf = async (userId: string, since: string | null): Promise<Map<string, UserCalendarMonthData>> => {
  const collection = calendarMonthsOf(userId);
  const query = since === null
    ? collection
    : collection.where('updated_at', '>', Timestamp.fromDate(new Date(since)));

  const snapshot = await query.get();

  return new Map(snapshot.docs.map((document) => [ document.id, document.data() ]));
};

const calendarMonthOf = async (userId: string, monthKey: string): Promise<UserCalendarMonthData | null> => (
  getSubDocumentRef(
    getDocumentRef(USER_COLLECTION, userId, userConverter),
    USER_CALENDAR_MONTH_COLLECTION,
    monthKey,
    userCalendarMonthConverter,
  ).get().then(parseData)
);

/**
 * What two calendars of the same month agree on — the days both hold, and
 * within them the days holding the same option.
 *
 * Both exclusions of docs/prd.md §5.3 come for free from the source. A **joker**
 * is projected into `jokers` and never into `days`, so it is not a day to agree
 * or disagree with. The **onboarding demo** is projected into no month at all —
 * it carries an empty date and the answer trigger returns before the projection
 * — so it cannot put a free point of agreement in every pair.
 *
 * Keyed by day of the month rather than by question, unlike the collection-group
 * walk this replaced: one question runs per day, so the two are the same
 * intersection, and a calendar entry does not carry the question it answers.
 */
const monthTallyOf = (own: UserCalendarMonthData | null, friend: UserCalendarMonthData | null): FriendCompatibilityMonthData => {
  if (own === null || friend === null) {
    return { common_days: 0, matching_days: 0 };
  }

  return Object.entries(own.days).reduce<FriendCompatibilityMonthData>((tally, [ monthDayKey, day ]) => {
    const other = friend.days[monthDayKey];

    if (other === undefined) {
      return tally;
    }

    return {
      common_days: tally.common_days + 1,
      matching_days: tally.matching_days + (other.option_id === day.option_id ? 1 : 0),
    };
  }, { common_days: 0, matching_days: 0 });
};

/**
 * How alike two accounts answered since `since` — docs/prd.md §5.3, read as a
 * **diff** rather than as a rebuild.
 *
 * The source is `v1_user_calendar_months` and not the answers themselves. The
 * calendar is the read model the Stats screen is already built on: one document
 * per user per month, carrying the picked `option_id` of every answered day. It
 * holds exactly what the comparison needs, and it holds a year of it in twelve
 * documents instead of three hundred and sixty-five.
 *
 * On top of that, only the months that moved are read: the pair document keeps
 * the tally cut by month, so a pass folds the recomputed months over the stored
 * ones and leaves the rest alone. What that buys, at twelve months of history
 * and ten friends consulted in a day, is roughly forty reads where the walk over
 * `v1_daily_question_answers` cost seven thousand — and, unlike that walk, a
 * number that stops growing with the age of the two accounts.
 *
 * A month is recomputed **whole**, never incremented, which is what makes the
 * pass idempotent: two of them overlapping, or one replaying a month the other
 * already folded in, write the same two numbers. That is also what lets the
 * cursor be stamped behind the reads rather than exactly on them.
 */
export const compatibilityDiffSince = async (
  userId: string,
  friendId: string,
  since: string | null,
): Promise<CompatibilityDiff> => {
  // Taken before the reads, so a month written while they run is walked again
  // by the next pass rather than skipped by it.
  const startedAt = Date.now();

  const [ own, friend ] = await Promise.all([
    changedMonthsOf(userId, since),
    changedMonthsOf(friendId, since),
  ]);

  const monthKeys = [ ...new Set([ ...own.keys(), ...friend.keys() ]) ];

  // A month only one of the two touched is half a comparison: the other side's
  // document is fetched by path, its id being the month key itself — no query,
  // one read, and null when that side has no such month. A first pass has read
  // both calendars whole already, so there is nothing left to fetch.
  const missing = since === null ? [] : monthKeys.flatMap((monthKey) => [
    ...(own.has(monthKey) ? [] : [ [ userId, monthKey ] as const ]),
    ...(friend.has(monthKey) ? [] : [ [ friendId, monthKey ] as const ]),
  ]);

  const fetched = await Promise.all(missing.map(async ([ id, monthKey ]) => (
    [ id, monthKey, await calendarMonthOf(id, monthKey) ] as const
  )));

  fetched.forEach(([ id, monthKey, month ]) => {
    if (month !== null) {
      (id === userId ? own : friend).set(monthKey, month);
    }
  });

  // Built by reduce, not by indexing: the same `noUncheckedIndexedAccess` the
  // models package builds its maps under.
  const months = monthKeys.reduce<Record<string, FriendCompatibilityMonthData>>((acc, monthKey) => {
    acc[monthKey] = monthTallyOf(own.get(monthKey) ?? null, friend.get(monthKey) ?? null);

    return acc;
  }, {});

  return {
    months,
    synced_at: new Date(startedAt - COMPATIBILITY_SYNC_MARGIN_MS).toISOString(),
  };
};
