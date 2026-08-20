import { getFunctions } from 'firebase-admin/functions';
import { logger } from 'firebase-functions/v2';

import { initFirebase, REGION_CLOUD } from '@/libs/firebase-admin';

/**
 * Cloud Function id of the task handler, as Firebase names it: the domain
 * namespace from `src/index.ts` joined to the export name by a dash.
 */
export const NOTIFY_DAILY_QUESTION_FUNCTION = 'dailyQuestions-notifyDailyQuestion';

const TASK_ALREADY_EXISTS = 'functions/task-already-exists';

export interface NotifyDailyQuestionPayload {
  /** `YYYY-MM-DD` Paris day the question is published on. */
  date: string;
  /** Document id in `v1_questions` — what the handler reads the label off, and what its logs are traced by. */
  question_id: string;
}

/**
 * Queues the publication notification for a day's question, for immediate
 * dispatch — the question drops the moment the scheduler draws it (docs/prd.md §4.2).
 *
 * It still goes through Cloud Tasks rather than being sent inline: the fan-out
 * to every user gets its own retries and its own rate limit, and a failing push
 * never makes the scheduler re-draw the day.
 *
 * The task id is derived from the day, which is what makes the whole scheduler
 * run idempotent: a retry re-enqueues the same id, Cloud Tasks rejects it, and
 * nobody is notified twice. One task a day is far below the rate at which
 * sequential ids start costing latency.
 */
export const enqueueDailyQuestionNotification = async (
  payload: NotifyDailyQuestionPayload,
): Promise<void> => {
  const queue = getFunctions(initFirebase())
    .taskQueue<NotifyDailyQuestionPayload>(`locations/${REGION_CLOUD}/functions/${NOTIFY_DAILY_QUESTION_FUNCTION}`);

  try {
    await queue.enqueue(payload, { id: `daily-question-${payload.date}` });
  } catch (error) {
    if ((error as { code?: string }).code !== TASK_ALREADY_EXISTS) {
      throw error;
    }

    logger.info('Notification already queued for this day, nothing to do', { date: payload.date });
  }
};
