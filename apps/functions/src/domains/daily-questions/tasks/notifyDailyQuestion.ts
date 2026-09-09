import { onTaskDispatched } from 'firebase-functions/v2/tasks';
import { logger } from 'firebase-functions/v2';
import { z } from 'zod';

import {
  DAILY_QUESTION_CHANNEL_ID,
  QUESTION_COLLECTION,
  questionConverter,
} from '@statowrel/models';

import { type PushNotification, sendPushToUsers } from '@/domains/notifications';
import { REGION_CLOUD, getDocumentRef, parseData } from '@/libs/firebase-admin';

import { resolveAuthorNotifications } from '../helpers/authorNotifications';

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
 * **Two accounts get a different line, and neither is a second push.** The
 * author of the question being posed this morning is told it is theirs, and the
 * author of yesterday's is told what it collected — docs/prd.md §4.7. Both take
 * the slot the generic drop would have had, in the per-user fan-out that
 * already exists for the 18:00 nudge, so the whole feature costs no scheduler,
 * no trigger, no second function and no second banner
 * (`helpers/authorNotifications.ts`).
 *
 * Retried by Cloud Tasks, and the retry re-sends the whole fan-out rather than
 * resuming it: nothing tracks who already got the push, and a duplicate banner
 * is a smaller failure than a silent day. Which is also why the author lines
 * need no marker of their own — the day's task id is the only idempotency there
 * is here, and it is the *scheduler* it protects (`helpers/notificationQueue.ts`).
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

  const drop: PushNotification = {
    title: NOTIFICATION_TITLE,
    body: question?.label ?? FALLBACK_BODY,
    channelId: DAILY_QUESTION_CHANNEL_ID,
    // The day rather than the question: the app routes on a date
    // (`DailyQuestion`'s `date` param), and an id it would have to resolve
    // first tells it nothing more.
    data: { type: 'daily_question', date },
  };

  const authors = await resolveAuthorNotifications(date, question);

  // One notification resolved per device, the way the 18:00 nudge does it: the
  // map is empty on an ordinary morning, and everybody gets `drop`.
  const report = await sendPushToUsers((userId) => authors.lines.get(userId) ?? drop);

  logger.info('Daily question published', { date, question_id, ...authors.report, ...report });
});
