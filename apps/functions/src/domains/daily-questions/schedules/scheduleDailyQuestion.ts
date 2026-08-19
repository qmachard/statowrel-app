import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions/v2';
import { Timestamp } from 'firebase-admin/firestore';
import {
  DAILY_QUESTION_COLLECTION,
  DAILY_QUESTION_TIME_ZONE,
  type DailyQuestionData,
  dailyQuestionConverter,
  dailyQuestionDateKey,
  QUESTION_COLLECTION,
  questionConverter,
} from '@statowrel/models';

import { createWriteBatch, getDocumentRef, parseData, REGION_CLOUD } from '@/libs/firebase-admin';

import { drawApprovedQuestion } from '../helpers/drawQuestion';
import { enqueueDailyQuestionNotification } from '../helpers/notificationQueue';
import { nextDateKey } from '../helpers/parisTime';
import { closingTimeOf, pickPublishedAt } from '../helpers/publicationTime';

const dailyQuestionRefOf = (date: string) => (
  getDocumentRef(DAILY_QUESTION_COLLECTION, date, dailyQuestionConverter)
);

/**
 * Draws one approved question for `date`, picks the time it drops, and commits
 * both halves of that decision: the day document and the question turning `used`.
 *
 * Returns `null` when the approved pot is empty — that day gets no question at
 * all, which the app already renders as an inert day (docs/prd.md §5.2).
 */
const drawDailyQuestion = async (date: string): Promise<DailyQuestionData | null> => {
  const question = await drawApprovedQuestion();

  if (question === null) {
    logger.error('No approved question left to draw — no daily question for this day', { date });

    return null;
  }

  const publishedAt = pickPublishedAt(date);
  const dailyQuestion: DailyQuestionData = {
    date,
    question_id: question.id,
    published_at: publishedAt.toISOString(),
    closes_at: closingTimeOf(date).toISOString(),
    answer_counts: {},
  };

  // One batch, so a question can never be marked `used` without the day that
  // uses it existing — nor stay `approved` and be drawn again tomorrow.
  const batch = createWriteBatch();

  batch.set(dailyQuestionRefOf(date), dailyQuestion);
  batch.update(getDocumentRef(QUESTION_COLLECTION, question.id, questionConverter), {
    status: 'used',
    broadcast_at: Timestamp.fromDate(publishedAt),
  });

  await batch.commit();

  return dailyQuestion;
};

/**
 * Draws tomorrow's question, picks the time it drops, and schedules the
 * notification for that time — docs/prd.md §6, "Backend".
 *
 * It runs a day ahead so the drop time can be anywhere in the 08:00–20:00
 * window, the earliest slot included. Writing `v1_daily_questions/{date}` early
 * leaks nothing: `firestore.rules` refuses an answer before `published_at`, and
 * the app reads a day by its date key, which is still in the future.
 */
export const scheduleDailyQuestion = onSchedule({
  region: REGION_CLOUD,
  schedule: '0 2 * * *',
  timeZone: DAILY_QUESTION_TIME_ZONE,
}, async () => {
  const date = nextDateKey(dailyQuestionDateKey(new Date()));

  // A day is drawn once and only once: a retried run reuses what the previous
  // attempt already committed instead of burning a second question.
  const scheduled = parseData(await dailyQuestionRefOf(date).get()) ?? await drawDailyQuestion(date);

  if (scheduled === null) {
    return;
  }

  await enqueueDailyQuestionNotification(
    { date, question_id: scheduled.question_id },
    new Date(scheduled.published_at),
  );

  logger.info('Daily question scheduled', {
    date,
    question_id: scheduled.question_id,
    published_at: scheduled.published_at,
  });
});
