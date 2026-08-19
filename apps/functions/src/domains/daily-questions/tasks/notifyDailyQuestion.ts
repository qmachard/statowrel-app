import { onTaskDispatched } from 'firebase-functions/v2/tasks';
import { logger } from 'firebase-functions/v2';
import { z } from 'zod';

import { REGION_CLOUD } from '@/libs/firebase-admin';

const payloadSchema = z.object({
  date: z.string(),
  question_id: z.string(),
});

/**
 * Pushes the day's question to every user, at the drop time the daily scheduler
 * picked — docs/prd.md §4.2.
 *
 * The notification itself is not implemented yet: this handler exists so the
 * scheduler has a queue to enqueue into, and so the drop time is already
 * honoured end to end. Sending the push is the next step.
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

  // TODO: send the push notification to every user (docs/prd.md §4.2).
  logger.info('Daily question published', {
    date: payload.data.date,
    question_id: payload.data.question_id,
  });
});
