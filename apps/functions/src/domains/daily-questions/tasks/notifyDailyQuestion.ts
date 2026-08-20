import { onTaskDispatched } from 'firebase-functions/v2/tasks';
import { logger } from 'firebase-functions/v2';
import { z } from 'zod';

import {
  DAILY_QUESTION_CHANNEL_ID,
  QUESTION_COLLECTION,
  questionConverter,
} from '@statowrel/models';

import { sendPushToAllDevices } from '@/domains/notifications';
import { REGION_CLOUD, getDocumentRef, parseData } from '@/libs/firebase-admin';

const payloadSchema = z.object({
  date: z.string(),
  question_id: z.string(),
});

/** docs/prd.md §3 — the line the whole daily loop starts on. */
const NOTIFICATION_TITLE = 'La question du jour est tombée';

const FALLBACK_BODY = 'Tu as jusqu\'à minuit pour répondre.';

/**
 * Pushes the day's question to every user, at the drop time the daily scheduler
 * picked — docs/prd.md §4.2.
 *
 * The question is read here, for its label: the notification is the one place
 * the question is worth spoiling, since reading it is what makes somebody open
 * the app. One document read a day, against a payload that could have skipped
 * it — a trade the body is worth. A question that cannot be read still gets a
 * notification, on a generic body, because the drop matters more than the
 * teaser.
 *
 * Retried by Cloud Tasks, and the retry re-sends the whole fan-out rather than
 * resuming it: nothing tracks who already got the push, and a duplicate banner
 * is a smaller failure than a silent day. The task id is the day's, so the
 * *scheduler* can never enqueue this twice (`helpers/notificationQueue.ts`).
 */
export const notifyDailyQuestion = onTaskDispatched({
  region: REGION_CLOUD,
  retryConfig: { maxAttempts: 3, minBackoffSeconds: 30 },
  rateLimits: { maxConcurrentDispatches: 5 },
}, async (request) => {
  const payload = payloadSchema.safeParse(request.data);

  if (!payload.success) {
    logger.error('Invalid notifyDailyQuestion payload, dropping the task', payload.error.issues);

    return;
  }

  const { date, question_id } = payload.data;

  const question = await getDocumentRef(QUESTION_COLLECTION, question_id, questionConverter)
    .get()
    .then(parseData);

  if (question === null) {
    logger.warn('Notifying a day whose question cannot be read', { date, question_id });
  }

  const report = await sendPushToAllDevices({
    title: NOTIFICATION_TITLE,
    body: question?.label ?? FALLBACK_BODY,
    channelId: DAILY_QUESTION_CHANNEL_ID,
    // The day rather than the question: the app routes on a date
    // (`DailyQuestion`'s `date` param), and an id it would have to resolve
    // first tells it nothing more.
    data: { type: 'daily_question', date },
  });

  logger.info('Daily question published', { date, question_id, ...report });
});
