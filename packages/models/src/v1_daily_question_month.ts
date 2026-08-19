import {
  type FirestoreConverter,
  type ModelData,
  type UniversalTimestamp,
  parseTimestamp,
  removeMissingFields,
} from './commons';

export const DAILY_QUESTION_MONTH_COLLECTION = 'v1_daily_question_months';

/**
 * `YYYY-MM` month key of a `YYYY-MM-DD` day key — the document id of a month.
 *
 * Both monthly documents (this one and `v1_user_calendar_months`) are keyed the
 * same way, so a day key always resolves to the same pair of coordinates:
 * `monthKeyOf(date)` picks the document, `monthDayKeyOf(date)` picks the entry
 * inside it.
 */
export const monthKeyOf = (dateKey: string): string => dateKey.slice(0, 7);

/** `DD` day-of-month key of a `YYYY-MM-DD` day key — the key a day is stored under inside `days`. */
export const monthDayKeyOf = (dateKey: string): string => dateKey.slice(8, 10);

/** The `YYYY-MM-DD` day key a month key and a day-of-month key point back at. */
export const dateKeyOf = (monthKey: string, monthDayKey: string): string => `${monthKey}-${monthDayKey}`;

export interface DailyQuestionMonthDayFirebaseData {
  /** Document id in `v1_questions` — the question that was broadcast that day. */
  question_id: string;
  /**
   * The question's `label`, copied at publication.
   *
   * It is what the Stats screen's banner announces while today's question is
   * still open (docs/prd.md §5.2) — and since the month is already loaded for
   * the calendar, announcing it costs nothing. Without the copy the banner
   * would be two extra reads on every app opening, for one line of text.
   *
   * A display cache like `v1_user_calendar_months.stat_label`, and staler by
   * design: the banner shows it for a single day, the question sheet reads the
   * real `v1_questions` document.
   */
  label: string;
}

/**
 * One document per calendar month, shared by every user: which days actually
 * had a question — see docs/prd.md §5.2.
 *
 * The Stats calendar has to tell a **missed** day (a question was broadcast and
 * the user let it go) from an **inert** one (no question was ever broadcast —
 * before the launch, or a publication incident). Without this document that
 * answer costs one read per day of the month on `v1_daily_questions`, for every
 * user and every month browsed; with it, it costs one read for the whole month,
 * the same one for everybody.
 *
 * Written by the daily scheduler in the same batch that creates the day, so a
 * day can never exist without its month entry. The document id is the month
 * key, and each entry is keyed by its day of the month — a merge on
 * `days.{DD}` never rewrites the rest of the month.
 *
 * A past month is never modified again, which makes it safe to cache
 * indefinitely on the client. The current month gains one entry a day.
 */
export interface DailyQuestionMonthFirebaseData {
  /** `YYYY-MM`, same value as the document id — carried as a field so it can be ordered and filtered on. */
  month: string;
  /** Broadcast days of the month, keyed by their zero-padded day of the month (`'01'`…`'31'`). A day with no question is simply absent. */
  days: Record<string, DailyQuestionMonthDayFirebaseData>;
  /** Bumped on every entry written into the month — the day the month last gained a question. */
  updated_at: UniversalTimestamp;
}

export type DailyQuestionMonthDayData = ModelData<DailyQuestionMonthDayFirebaseData>;

export type DailyQuestionMonthData = ModelData<DailyQuestionMonthFirebaseData>;

const parseDays = (
  days: Record<string, Partial<DailyQuestionMonthDayFirebaseData>> | null | undefined,
): Record<string, DailyQuestionMonthDayData> => (
  // Built by reduce, not by indexing: `noUncheckedIndexedAccess` is on in this package.
  Object.entries(days ?? {}).reduce<Record<string, DailyQuestionMonthDayData>>((acc, [ monthDayKey, day ]) => {
    if (typeof day?.question_id === 'string' && day.question_id.length > 0) {
      acc[monthDayKey] = { question_id: day.question_id, label: day.label ?? '' };
    }

    return acc;
  }, {})
);

export const dailyQuestionMonthConverter: FirestoreConverter<DailyQuestionMonthData, DailyQuestionMonthFirebaseData> = (TimestampClass) => ({
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
