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
import { closingTimeOf, publicationTimeOf, PUBLICATION_HOUR } from '../helpers/publicationTime';

const dailyQuestionRefOf = (date: string) => (
  getDocumentRef(DAILY_QUESTION_COLLECTION, date, dailyQuestionConverter)
);

/**
 * Draws one approved question for `date` and commits both halves of that
 * decision: the day document and the question turning `used`.
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

  const publishedAt = publicationTimeOf(date);
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
 * Draws today's question at 07:00 Paris and pushes it to everyone right away —
 * docs/prd.md §6, "Backend".
 *
 * One question, one drop time, the same for all users: the day is drawn and
 * published in the same run, and stays open until Paris midnight, so everyone
 * has the whole day to answer (docs/prd.md §4.2).
 */
export const scheduleDailyQuestion = onSchedule({
  region: REGION_CLOUD,
  schedule: `0 ${PUBLICATION_HOUR} * * *`,
  timeZone: DAILY_QUESTION_TIME_ZONE,
}, async () => {
  const date = dailyQuestionDateKey(new Date());

  // A day is drawn once and only once: a retried run reuses what the previous
  // attempt already committed instead of burning a second question.
  const scheduled = parseData(await dailyQuestionRefOf(date).get()) ?? await drawDailyQuestion(date);

  if (scheduled === null) {
    return;
  }

  await enqueueDailyQuestionNotification({ date, question_id: scheduled.question_id });

  logger.info('Daily question published', {
    date,
    question_id: scheduled.question_id,
    published_at: scheduled.published_at,
  });
});
