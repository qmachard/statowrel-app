import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions/v2';
import {
  DAILY_QUESTION_TIME_ZONE,
  dailyQuestionDateKey,
  STREAK_REMINDER_HOUR,
} from '@statowrel/models';

import { REGION_CLOUD } from '@/libs/firebase-admin';

import { scheduledQuestionOf } from '../helpers/monthIndex';
import { enqueueStreakReminderNotification } from '../helpers/notificationQueue';

/**
 * Queues the last-chance reminder for today at 21:00 Paris — docs/prd.md §4.6.
 *
 * The exact shape of the 18:00 scheduler, and for the same reason: it reads
 * the day's question id and nothing else, because *who* is about to lose a
 * streak is the task's job (`tasks/notifyStreakReminder.ts`) and has to be
 * answered at dispatch time rather than at 21:00 sharp.
 *
 * A day no question ran on has no streak to save: nobody could have answered,
 * so nobody is at fault, and telling them their série is about to break would
 * be the app blaming a user for its own missing draw.
 */
export const scheduleStreakReminder = onSchedule({
  region: REGION_CLOUD,
  schedule: `0 ${STREAK_REMINDER_HOUR} * * *`,
  timeZone: DAILY_QUESTION_TIME_ZONE,
}, async () => {
  const date = dailyQuestionDateKey(new Date());

  const scheduled = await scheduledQuestionOf(date);

  if (scheduled === null) {
    logger.warn('No question ran today, no streak is at risk', { date });

    return;
  }

  await enqueueStreakReminderNotification({ date, question_id: scheduled.question_id });

  logger.info('Streak reminder queued', { date, question_id: scheduled.question_id });
});
