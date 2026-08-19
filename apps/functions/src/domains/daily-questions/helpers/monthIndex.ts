import {
  DAILY_QUESTION_MONTH_COLLECTION,
  type DailyQuestionMonthData,
  type DailyQuestionMonthDayData,
  dailyQuestionMonthConverter,
  monthDayKeyOf,
  monthKeyOf,
} from '@statowrel/models';
import { FieldValue } from 'firebase-admin/firestore';

import { getDocumentRef } from '@/libs/firebase-admin';

/**
 * `v1_daily_question_months/{YYYY-MM}` — the month index a day key falls in.
 *
 * The calendar of docs/prd.md §5.2 reads *only* this document to know a day
 * happened: a day missing from it is rendered inert, whatever
 * `v1_daily_questions` holds. Which is why writing the day and indexing it are
 * never left to two different callers to remember.
 */
export const dailyQuestionMonthRefOf = (date: string) => (
  getDocumentRef(DAILY_QUESTION_MONTH_COLLECTION, monthKeyOf(date), dailyQuestionMonthConverter)
);

/**
 * The month document as it has to be written for one day — always through a
 * `set` with `merge`, which deep-merges maps: it adds the one `days` entry
 * rather than replacing the month, and creates the document on the month's
 * first day without a separate check.
 */
export const monthIndexOf = (
  date: string,
  day: DailyQuestionMonthDayData,
  updatedAt: string,
): DailyQuestionMonthData => ({
  month: monthKeyOf(date),
  days: { [monthDayKeyOf(date)]: day },
  updated_at: updatedAt,
});

/** gRPC `NOT_FOUND` — the document the write was aimed at does not exist. */
const NOT_FOUND = 5;

const isNotFound = (error: unknown): boolean => (
  typeof error === 'object' && error !== null && 'code' in error && error.code === NOT_FOUND
);

/** What the index currently says about that day, or `null` when it says nothing. */
export const readIndexedDay = async (date: string): Promise<DailyQuestionMonthDayData | null> => {
  const month = (await dailyQuestionMonthRefOf(date).get()).data();

  return month?.days[monthDayKeyOf(date)] ?? null;
};

/**
 * Drops a day from its month index — the day document is gone, so the calendar
 * must stop offering it. A day left indexed behind a deleted document shows as
 * missed forever and opens on a dead end.
 *
 * `update()` on a field path rather than a `set`, so the rest of the month is
 * untouched; a month document that doesn't exist has nothing to forget.
 */
export const forgetIndexedDay = async (date: string): Promise<void> => {
  try {
    await dailyQuestionMonthRefOf(date).update(`days.${monthDayKeyOf(date)}`, FieldValue.delete());
  } catch (error) {
    // No month document means the day was never indexed, and there is nothing
    // to forget. Anything else is worth failing on, so the trigger retries
    // rather than leaving a deleted day catchable forever.
    if (!isNotFound(error)) {
      throw error;
    }
  }
};
