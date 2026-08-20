import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions/v2';
import { Timestamp } from 'firebase-admin/firestore';
import {
  DAILY_QUESTION_MONTH_COLLECTION,
  DAILY_QUESTION_TIME_ZONE,
  type DailyQuestionMonthDayData,
  dailyQuestionMonthConverter,
  dailyQuestionDateKey,
  monthDayKeyOf,
  monthKeyOf,
  QUESTION_COLLECTION,
  questionConverter,
} from '@statowrel/models';

import { createWriteBatch, getDocumentRef, parseData, REGION_CLOUD } from '@/libs/firebase-admin';

import { drawApprovedQuestion } from '../helpers/drawQuestion';
import { enqueueDailyQuestionNotification } from '../helpers/notificationQueue';
import { closingTimeOf, publicationTimeOf, PUBLICATION_HOUR } from '../helpers/publicationTime';

const dailyQuestionMonthRefOf = (date: string) => (
  getDocumentRef(DAILY_QUESTION_MONTH_COLLECTION, monthKeyOf(date), dailyQuestionMonthConverter)
);

/** The question already drawn for `date`, or `null` — the month index is the day. */
const scheduledQuestionOf = async (date: string): Promise<DailyQuestionMonthDayData | null> => {
  const month = parseData(await dailyQuestionMonthRefOf(date).get());

  return month?.days[monthDayKeyOf(date)] ?? null;
};

/**
 * Draws one approved question for `date` and commits both halves of that
 * decision: the question turning `used` and carrying its broadcast, and the
 * month entry pointing the day at it.
 *
 * Returns `null` when the approved pot is empty — that day gets no question at
 * all, which the app already renders as an inert day (docs/prd.md §5.2).
 */
const drawDailyQuestion = async (date: string): Promise<DailyQuestionMonthDayData | null> => {
  const question = await drawApprovedQuestion();

  if (question === null) {
    logger.error('No approved question left to draw — no daily question for this day', { date });

    return null;
  }

  const publishedAt = publicationTimeOf(date);

  // One batch, so a question can never be broadcast without the month entry
  // that points at it — nor stay `approved` and be drawn again tomorrow. A day
  // the calendar cannot see is a day nobody can catch up on (docs/prd.md §5.2),
  // and since there is no per-day document, it is also a day nobody can answer:
  // `firestore.rules` checks an answer against the question's own
  // `broadcast_on`, which this batch is what sets.
  const batch = createWriteBatch();

  // `update()` does not run the converter (see the repo's CLAUDE.md), so these
  // are Timestamps and not ISO strings. `answer_counts` is left alone: the
  // answer trigger creates the map on its first `increment`, and rewriting it
  // here would zero a day that somehow already had answers.
  batch.update(getDocumentRef(QUESTION_COLLECTION, question.id, questionConverter), {
    status: 'used',
    broadcast_at: Timestamp.fromDate(publishedAt),
    broadcast_on: date,
    closes_at: Timestamp.fromDate(closingTimeOf(date)),
  });
  // `merge` deep-merges maps, so this adds one entry to the month rather than
  // replacing the days already in it.
  batch.set(dailyQuestionMonthRefOf(date), {
    month: monthKeyOf(date),
    days: { [monthDayKeyOf(date)]: { question_id: question.id, label: question.label } },
    updated_at: publishedAt.toISOString(),
  }, { merge: true });

  await batch.commit();

  return { question_id: question.id, label: question.label };
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
  // attempt already committed instead of burning a second question. The month
  // entry is the marker, since it is written in the same batch as the draw.
  const scheduled = await scheduledQuestionOf(date) ?? await drawDailyQuestion(date);

  if (scheduled === null) {
    return;
  }

  await enqueueDailyQuestionNotification({ date, question_id: scheduled.question_id });

  logger.info('Daily question published', { date, question_id: scheduled.question_id });
});
