import {
  type FirestoreConverter,
  type ModelData,
  type UniversalTimestamp,
  parseTimestamp,
  removeMissingFields,
} from './commons';

export const DAILY_QUESTION_COLLECTION = 'v1_daily_questions';

/** Everyone is on Europe/Paris — the day rolls over at Paris midnight, not UTC's (docs/prd.md §7). */
export const DAILY_QUESTION_TIME_ZONE = 'Europe/Paris';

/**
 * The `YYYY-MM-DD` key of the day a `Date` falls on, in Europe/Paris.
 *
 * This is the document id of a daily question and the `date` of every answer to
 * it. Never derive it with `toISOString().slice(0, 10)`: that reads the UTC day,
 * so anything between Paris midnight and 2am lands on the day before.
 */
export const dailyQuestionDateKey = (date: Date): string => (
  // 'en-CA' is the locale whose short date format is already YYYY-MM-DD.
  new Intl.DateTimeFormat('en-CA', { timeZone: DAILY_QUESTION_TIME_ZONE }).format(date)
);

/**
 * One document per day — see docs/prd.md §6.
 *
 * The document id is the `YYYY-MM-DD` day key, not a ULID: the app reads today's
 * question by building the id (`dailyQuestionDateKey(new Date())`) rather than
 * querying for it, and the scheduler that draws tomorrow's question can `set()`
 * the same id twice without ever creating two questions for one day.
 */
export interface DailyQuestionFirebaseData {
  /** `YYYY-MM-DD`, same value as the document id — carried as a field so it can be ordered and filtered on. */
  date: string;
  /** Document id in `v1_questions`. That question's `status` becomes `used` when it is drawn. */
  question_id: string;
  /** When the question was pushed to the app — 07:00 Paris, the same hour for everyone (docs/prd.md §4.2). */
  published_at: UniversalTimestamp;
  /** Paris midnight. Past it, an answer no longer counts for the streak and is flagged `late` (docs/prd.md §4.6). */
  closes_at: UniversalTimestamp;
  /**
   * Total answers per option, keyed by `QuestionOptionFirebaseData.id`.
   *
   * A map rather than an array so the answer trigger increments
   * `answer_counts.{option_id}` — a fixed path — with `FieldValue.increment(1)`:
   * two simultaneous answers can't overwrite each other. An option with no
   * answer yet is simply absent, not `0`.
   *
   * The card's rarity (docs/prd.md §5.5) is the picked option's share of the
   * sum of this map, recomputed at display time: it keeps moving while answers
   * come in and settles at close.
   */
  answer_counts: Record<string, number>;
}

export type DailyQuestionData = ModelData<DailyQuestionFirebaseData>;

const parseAnswerCounts = (
  counts: Record<string, number> | null | undefined,
): Record<string, number> => (
  // Built by reduce, not by indexing: `noUncheckedIndexedAccess` is on in this package.
  Object.entries(counts ?? {}).reduce<Record<string, number>>((acc, [ optionId, total ]) => {
    if (typeof total === 'number') {
      acc[optionId] = total;
    }

    return acc;
  }, {})
);

export const dailyQuestionConverter: FirestoreConverter<DailyQuestionData, DailyQuestionFirebaseData> = (TimestampClass) => ({
  toFirestore: (data) => removeMissingFields({
    date: data.date,
    question_id: data.question_id,
    published_at: TimestampClass.fromDate(new Date(data.published_at)),
    closes_at: TimestampClass.fromDate(new Date(data.closes_at)),
    answer_counts: parseAnswerCounts(data.answer_counts),
  }),
  fromFirestore: (snap) => {
    const data = snap.data();

    return {
      date: data.date ?? '',
      question_id: data.question_id ?? '',
      published_at: parseTimestamp(data.published_at ?? null, 'now'),
      closes_at: parseTimestamp(data.closes_at ?? null, 'now'),
      answer_counts: parseAnswerCounts(data.answer_counts),
    };
  },
});
