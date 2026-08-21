import { getFunctions } from 'firebase-admin/functions';
import { logger } from 'firebase-functions/v2';

import { initFirebase, REGION_CLOUD } from '@/libs/firebase-admin';

/**
 * Cloud Function ids of the task handlers, as Firebase names them: the domain
 * namespace from `src/index.ts` joined to the export name by a dash.
 */
export const NOTIFY_DAILY_QUESTION_FUNCTION = 'dailyQuestions-notifyDailyQuestion';

export const NOTIFY_FRIENDS_ANSWERS_FUNCTION = 'dailyQuestions-notifyFriendsAnswers';

const TASK_ALREADY_EXISTS = 'functions/task-already-exists';

/** What both notification tasks are handed: the day, and the question that ran it. */
export interface DailyQuestionNotificationPayload {
  /** `YYYY-MM-DD` Paris day the question is published on. */
  date: string;
  /** Document id in `v1_questions` — what the handler reads the label or the answers off, and what its logs are traced by. */
  question_id: string;
}

/**
 * Queues one notification task for immediate dispatch, under an id derived from
 * the day.
 *
 * That id is what makes the scheduler runs idempotent: a retry re-enqueues the
 * same id, Cloud Tasks rejects it, and nobody is notified twice. One task a day
 * per notification is far below the rate at which sequential ids start costing
 * latency.
 */
const enqueueNotification = async (
  functionName: string,
  taskId: string,
  payload: DailyQuestionNotificationPayload,
): Promise<void> => {
  const queue = getFunctions(initFirebase())
    .taskQueue<DailyQuestionNotificationPayload>(`locations/${REGION_CLOUD}/functions/${functionName}`);

  try {
    await queue.enqueue(payload, { id: taskId });
  } catch (error) {
    if ((error as { code?: string }).code !== TASK_ALREADY_EXISTS) {
      throw error;
    }

    logger.info('Notification already queued for this day, nothing to do', {
      date: payload.date,
      function: functionName,
    });
  }
};

/**
 * Queues the publication notification for a day's question — the question drops
 * the moment the scheduler draws it (docs/prd.md §4.2).
 *
 * It goes through Cloud Tasks rather than being sent inline: the fan-out to
 * every user gets its own retries and its own rate limit, and a failing push
 * never makes the scheduler re-draw the day.
 */
export const enqueueDailyQuestionNotification = async (
  payload: DailyQuestionNotificationPayload,
): Promise<void> => (
  enqueueNotification(NOTIFY_DAILY_QUESTION_FUNCTION, `daily-question-${payload.date}`, payload)
);

/**
 * Queues the 18:00 nudge for a day's question — how many friends have answered,
 * to whoever still owes an answer (docs/prd.md §4.5).
 *
 * Same reasoning as above, plus one of its own: the recipients are computed
 * inside the task, so a retry recounts against the answers as they stand then
 * rather than replaying a list the scheduler froze an hour earlier.
 */
export const enqueueFriendsAnswersNotification = async (
  payload: DailyQuestionNotificationPayload,
): Promise<void> => (
  enqueueNotification(NOTIFY_FRIENDS_ANSWERS_FUNCTION, `friends-answers-${payload.date}`, payload)
);
