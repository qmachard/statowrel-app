import { logger } from 'firebase-functions/v2';
import {
  DAILY_QUESTION_MONTH_COLLECTION,
  type DailyQuestionData,
  type DailyQuestionMonthData,
  dailyQuestionMonthConverter,
  monthDayKeyOf,
  monthKeyOf,
  QUESTION_COLLECTION,
  questionConverter,
} from '@statowrel/models';

import { getDocumentRef, parseData } from '@/libs/firebase-admin';

export const dailyQuestionMonthRefOf = (date: string) => (
  getDocumentRef(DAILY_QUESTION_MONTH_COLLECTION, monthKeyOf(date), dailyQuestionMonthConverter)
);

/**
 * What one day contributes to its month index — see
 * `packages/models/src/v1_daily_question_month.ts`.
 *
 * Always written with `{ merge: true }`: Firestore deep-merges maps, so this
 * adds `days.{DD}` without touching the days already in the month, and creates
 * the document on the first day of the month without a separate check. Which
 * also makes it idempotent — writing the same day twice is a no-op in effect.
 */
export const monthIndexEntryOf = (
  date: string,
  questionId: string,
  label: string,
  updatedAt: string,
): DailyQuestionMonthData => ({
  month: monthKeyOf(date),
  days: { [monthDayKeyOf(date)]: { question_id: questionId, label } },
  updated_at: updatedAt,
});

/**
 * Puts an already-drawn day back into its month index, and says whether it had
 * to.
 *
 * A day is normally indexed in the very batch that creates it, so this exists
 * for the days where that did not happen: every day drawn before the index was
 * introduced, and any day whose scheduler run died between the draw and the
 * index. Such a day is complete in `v1_daily_questions` and answerable through
 * its route, but the Stats banner and the calendar read the month index alone —
 * so it is invisible to both, and the calendar renders it as a day that never
 * had a question.
 *
 * The month is read first so a day already indexed costs one read and no write.
 * The label is read off the question, which is the one thing the day document
 * does not carry.
 */
export const indexDailyQuestion = async (dailyQuestion: DailyQuestionData): Promise<boolean> => {
  const { date, question_id: questionId } = dailyQuestion;
  const monthRef = dailyQuestionMonthRefOf(date);
  const month = parseData(await monthRef.get());

  if (month?.days[monthDayKeyOf(date)] !== undefined) {
    return false;
  }

  const question = parseData(await getDocumentRef(QUESTION_COLLECTION, questionId, questionConverter).get());

  if (question === null) {
    // The day points at a question that no longer exists. Indexing it with an
    // empty label would put a blank banner on the screen, which is worse than
    // the day staying invisible — and this is a broken day, not a missing entry.
    logger.error('Daily question points at a question that does not exist', { date, question_id: questionId });

    return false;
  }

  await monthRef.set(
    monthIndexEntryOf(date, questionId, question.label, dailyQuestion.published_at),
    { merge: true },
  );

  logger.info('Indexed a daily question that was missing from its month', { date, question_id: questionId });

  return true;
};
