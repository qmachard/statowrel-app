import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions/v2';
import {
  DAILY_QUESTION_TIME_ZONE,
  dailyQuestionDateKey,
  FRIENDS_ANSWERS_HOUR,
} from '@statowrel/models';

import { REGION_CLOUD } from '@/libs/firebase-admin';

import { scheduledQuestionOf } from '../helpers/monthIndex';
import { enqueueFriendsAnswersNotification } from '../helpers/notificationQueue';

/**
 * Queues the friends nudge for today at 18:00 Paris — docs/prd.md §4.5.
 *
 * It reads nothing but the day's question id: who is nudged, and with what
 * count, is the task's job (`tasks/notifyFriendsAnswers.ts`), so that a retry
 * counts the answers as they stand rather than as they stood at 18:00 sharp.
 *
 * A day no question was drawn on — an empty approved pot, a publication
 * incident — has nothing to nudge about, and the run ends there.
 */
export const scheduleFriendsAnswersReminder = onSchedule({
  region: REGION_CLOUD,
  schedule: `0 ${FRIENDS_ANSWERS_HOUR} * * *`,
  timeZone: DAILY_QUESTION_TIME_ZONE,
}, async () => {
  const date = dailyQuestionDateKey(new Date());

  const scheduled = await scheduledQuestionOf(date);

  if (scheduled === null) {
    logger.warn('No question ran today, nobody to nudge', { date });

    return;
  }

  await enqueueFriendsAnswersNotification({ date, question_id: scheduled.question_id });

  logger.info('Friends answers nudge queued', { date, question_id: scheduled.question_id });
});
