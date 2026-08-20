import {
  type FirestoreConverter,
  type ModelData,
  type UniversalTimestamp,
  parseTimestamp,
  removeMissingFields,
} from './commons';

/**
 * Sub-collection of `v1_users`, at
 * `v1_users/{user_id}/v1_user_calendar_months/{YYYY-MM}`.
 *
 * Like every sub-collection here it keeps the `v1_` prefix and its parent's
 * name: a collection group is global to the database and keyed by the last path
 * segment alone, so a bare `calendar_months` could not be versioned on its own
 * and would collide with anything named the same later.
 */
export const USER_CALENDAR_MONTH_COLLECTION = 'v1_user_calendar_months';

export interface UserCalendarMonthDayFirebaseData {
  /** `QuestionOptionFirebaseData.id` of the option the user picked that day. */
  option_id: string;
  /**
   * The picked option's `stat_label`, copied at answer time.
   *
   * This is the whole point of the projection: the calendar renders it inside
   * the answered cell (docs/prd.md §5.2), and without the copy each answered
   * day would cost one more read — the answer's `v1_questions` document, to
   * resolve the option it points at.
   *
   * A display cache, not the truth: the card (docs/prd.md §5.5) reads the real
   * question anyway. Editing a question's `stat_label` in the backoffice leaves
   * the copies behind until they are backfilled.
   */
  stat_label: string;
  /** Copied from the answer — a catch-up day is complete but was never on time (docs/prd.md §4.6). */
  late: boolean;
}

/**
 * One document per user per calendar month: the days that user answered — the
 * read model behind the Stats calendar (docs/prd.md §5.2).
 *
 * Derived, never the source of truth: the answers themselves live in
 * `v1_questions/{question_id}/v1_daily_question_answers/{user_id}`, where the
 * document id is what makes "one answer per person per day" a property of the
 * data. This document only exists so that displaying a month costs one read
 * instead of one per answered day plus the question each of them joins to.
 *
 * Written by the answer trigger, in the transaction that also bumps the user's
 * counters — and the presence of a day's entry is what makes that transaction
 * idempotent, since a Firestore trigger is delivered at least once.
 *
 * Unlike `v1_daily_question_months`, a past month here is *not* frozen: a
 * catch-up answer (docs/prd.md §4.2) adds an entry to a month long closed.
 */
export interface UserCalendarMonthFirebaseData {
  /** `YYYY-MM`, same value as the document id — carried as a field so it can be ordered and filtered on. */
  month: string;
  /** Answered days of the month, keyed by their zero-padded day of the month (`'01'`…`'31'`). An unanswered day is simply absent. */
  days: Record<string, UserCalendarMonthDayFirebaseData>;
  /** Bumped on every day written into the month. */
  updated_at: UniversalTimestamp;
}

export type UserCalendarMonthDayData = ModelData<UserCalendarMonthDayFirebaseData>;

export type UserCalendarMonthData = ModelData<UserCalendarMonthFirebaseData>;

const parseDays = (
  days: Record<string, Partial<UserCalendarMonthDayFirebaseData>> | null | undefined,
): Record<string, UserCalendarMonthDayData> => (
  // Built by reduce, not by indexing: `noUncheckedIndexedAccess` is on in this package.
  Object.entries(days ?? {}).reduce<Record<string, UserCalendarMonthDayData>>((acc, [ monthDayKey, day ]) => {
    if (typeof day?.option_id === 'string' && day.option_id.length > 0) {
      acc[monthDayKey] = {
        option_id: day.option_id,
        stat_label: day.stat_label ?? '',
        late: day.late ?? false,
      };
    }

    return acc;
  }, {})
);

export const userCalendarMonthConverter: FirestoreConverter<UserCalendarMonthData, UserCalendarMonthFirebaseData> = (TimestampClass) => ({
  toFirestore: (data) => removeMissingFields({
    month: data.month,
    days: parseDays(data.days),
    updated_at: TimestampClass.fromDate(new Date(data.updated_at)),
  }),
  fromFirestore: (snap) => {
    const data = snap.data();

    return {
      month: data.month ?? '',
      days: parseDays(data.days),
      updated_at: parseTimestamp(data.updated_at ?? null, 'now'),
    };
  },
});
