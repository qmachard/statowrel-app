import {
  DAILY_QUESTION_MONTH_COLLECTION,
  type DailyQuestionMonthData,
  type DailyQuestionMonthDayData,
  dailyQuestionMonthConverter,
  monthDayKeyOf,
  monthKeyOf,
} from '@statowrel/models';
import type { DocumentReference } from 'firebase-admin/firestore';

import { getDocumentRef, parseData } from '@/libs/firebase-admin';

/** The month document a `YYYY-MM-DD` day belongs to — there is no per-day document, the month *is* the index. */
export const dailyQuestionMonthRefOf = (date: string): DocumentReference<DailyQuestionMonthData> => (
  getDocumentRef(DAILY_QUESTION_MONTH_COLLECTION, monthKeyOf(date), dailyQuestionMonthConverter)
);

/**
 * The question already drawn for `date`, or `null` — the month index is the day.
 *
 * Read by both schedulers: it is what makes the 07:00 draw idempotent (the
 * entry is written in the same batch as the draw, so its presence means the day
 * is done) and what the 18:00 nudge resolves the day's question through.
 */
export const scheduledQuestionOf = async (date: string): Promise<DailyQuestionMonthDayData | null> => {
  const month = parseData(await dailyQuestionMonthRefOf(date).get());

  return month?.days[monthDayKeyOf(date)] ?? null;
};
