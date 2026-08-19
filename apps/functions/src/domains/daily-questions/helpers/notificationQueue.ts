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
  /** `YYYY-MM-DD` id of the `v1_daily_questions` document to publish. */
  date: string;
  /** Document id in `v1_questions`, carried so the handler skips a read. */
  question_id: string;
}

/**
 * Schedules the publication notification for a day's question.
 *
 * The task id is derived from the day, which is what makes the whole scheduler
 * run idempotent: a retry re-enqueues the same id, Cloud Tasks rejects it, and
 * nobody is notified twice. One task a day is far below the rate at which
 * sequential ids start costing latency.
 */
export const enqueueDailyQuestionNotification = async (
  payload: NotifyDailyQuestionPayload,
  scheduleTime: Date,
): Promise<void> => {
  const queue = getFunctions(initFirebase())
    .taskQueue<NotifyDailyQuestionPayload>(`locations/${REGION_CLOUD}/functions/${NOTIFY_DAILY_QUESTION_FUNCTION}`);

  try {
    await queue.enqueue(payload, { scheduleTime, id: `daily-question-${payload.date}` });
  } catch (error) {
    if ((error as { code?: string }).code !== TASK_ALREADY_EXISTS) {
      throw error;
    }

    logger.info('Notification already scheduled for this day, nothing to do', { date: payload.date });
  }
};
