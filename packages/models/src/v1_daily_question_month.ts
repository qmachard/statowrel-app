import {
  type FirestoreConverter,
  type ModelData,
  type UniversalTimestamp,
  parseTimestamp,
  removeMissingFields,
} from './commons';

export const DAILY_QUESTION_MONTH_COLLECTION = 'v1_daily_question_months';

/** Everyone is on Europe/Paris — the day rolls over at Paris midnight, not UTC's (docs/prd.md §7). */
export const DAILY_QUESTION_TIME_ZONE = 'Europe/Paris';

/**
 * The `YYYY-MM-DD` key of the day a `Date` falls on, in Europe/Paris.
 *
 * This is the `date` of every answer, the `broadcast_on` of the question that
 * was drawn that day, and — through `monthKeyOf` / `monthDayKeyOf` below — the
 * pair of coordinates a day is indexed under. Never derive it with
 * `toISOString().slice(0, 10)`: that reads the UTC day, so anything between
 * Paris midnight and 2am lands on the day before.
 */
export const dailyQuestionDateKey = (date: Date): string => (
  // 'en-CA' is the locale whose short date format is already YYYY-MM-DD.
  new Intl.DateTimeFormat('en-CA', { timeZone: DAILY_QUESTION_TIME_ZONE }).format(date)
);

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

/**
 * The `[ year, monthIndex, day ]` a `YYYY-MM-DD` key stands for, in the shape
 * `Date.UTC` takes — `monthIndex` is zero-based, as everything `Date` is.
 *
 * Read by slices rather than by splitting on `-`, so each part is a `number`
 * and not a `number | undefined` the callers have to defend against.
 */
export const dateKeyParts = (dateKey: string): [ number, number, number ] => [
  Number(dateKey.slice(0, 4)),
  Number(dateKey.slice(5, 7)) - 1,
  Number(dateKey.slice(8, 10)),
];

/** The `YYYY-MM-DD` Paris day `count` days before `dateKey` — `previousDateKey('2026-03-01', 1)` is `'2026-02-28'`. */
export const previousDateKey = (dateKey: string, count = 1): string => {
  const [ year, monthIndex, day ] = dateKeyParts(dateKey);

  // Day keys are calendar days, not instants: walking them through UTC keeps
  // the arithmetic exact across a DST switch, where subtracting 24 hours from
  // a Paris instant would land on the same day twice.
  return new Date(Date.UTC(year, monthIndex, day - count)).toISOString().slice(0, 10);
};

export interface DailyQuestionMonthDayFirebaseData {
  /**
   * Document id in `v1_questions` — the question that was broadcast that day.
   *
   * The day's only pointer to its question, and the parent of every answer to
   * it (`v1_questions/{question_id}/v1_daily_question_answers`).
   */
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
 * One document per calendar month, shared by every user: which question ran
 * which day — see docs/prd.md §5.2 and §6.
 *
 * **This is the calendar of the daily cycle**, and the only thing that maps a
 * day to its question: there is no per-day document. Reading today's question
 * is one read here — `days[monthDayKeyOf(today)].question_id` — then the
 * `v1_questions` document it points at, which carries the drop time, the
 * closing time and the running tally of answers.
 *
 * It is also what lets the Stats calendar tell a **missed** day (a question was
 * broadcast and the user let it go) from an **inert** one (no question was ever
 * broadcast — before the launch, or a publication incident), for one read a
 * month rather than one a day.
 *
 * Written by the daily scheduler in the same batch that stamps the question, so
 * a broadcast question can never be missing from its month. The document id is
 * the month key, and each entry is keyed by its day of the month — a merge on
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
