import { onTaskDispatched } from 'firebase-functions/v2/tasks';
import { logger } from 'firebase-functions/v2';
import { z } from 'zod';

import { REGION_CLOUD } from '@/libs/firebase-admin';

import { sendStreakReminders } from '../helpers/streakReminder';

const payloadSchema = z.object({
  date: z.string(),
  question_id: z.string(),
});

/**
 * The 21:00 push: the streaks that die at midnight, and the shortest way to
 * save one — docs/prd.md §4.6.
 *
 * The third and last notification of the day, and the only one that is not for
 * everybody. That is what earns it the right to exist: a streak is the biggest
 * thing an account owns, it breaks in silence at midnight, and until now
 * nothing told its owner what they were about to lose. Sent to everyone it
 * would be the third identical relance in one evening — which is the answer
 * docs/prd.md §9 was waiting for. The targeting *is* the feature.
 *
 * Everything that decides who gets it — and the sending itself — lives in
 * `helpers/streakReminder.ts`, so that `npm run run-streak-reminder` can
 * exercise the same code against a seeded emulator. What lives here is the
 * same contract the other two tasks hold: an invalid payload is dropped
 * rather than retried, the recipients are resolved at dispatch rather than
 * at enqueue, and a Cloud Tasks retry re-sends the whole thing — recomputed,
 * so anybody who answered in between has already fallen out of the query.
 *
 * A quiet night is a normal night: an evening where everybody answered ends
 * with nothing sent, and the log line is what says so.
 */
export const notifyStreakReminder = onTaskDispatched({
  region: REGION_CLOUD,
  retryConfig: { maxAttempts: 3, minBackoffSeconds: 30 },
  rateLimits: { maxConcurrentDispatches: 5 },
}, async (request) => {
  const payload = payloadSchema.safeParse(request.data);

  if (!payload.success) {
    logger.error('Invalid notifyStreakReminder payload, dropping the task', payload.error.issues);

    return;
  }

  const { date, question_id } = payload.data;

  const report = await sendStreakReminders(date);

  logger.info('Streak reminder done', { date, question_id, ...report });
});
