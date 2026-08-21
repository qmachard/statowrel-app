import { onTaskDispatched } from 'firebase-functions/v2/tasks';
import { logger } from 'firebase-functions/v2';
import { z } from 'zod';

import { DAILY_QUESTION_CHANNEL_ID } from '@statowrel/models';

import { type PushNotification, sendPushToUsers } from '@/domains/notifications';
import { REGION_CLOUD } from '@/libs/firebase-admin';

import { friendsAnswersDigest } from '../helpers/friendsAnswers';

const payloadSchema = z.object({
  date: z.string(),
  question_id: z.string(),
});

/**
 * The evening nudge, in its two states — docs/prd.md §4.5.
 *
 * The count is the whole point of the 18:00 push, so when there is none to give
 * the notification says something else entirely rather than a « 0 de tes potes »
 * that reads as a bug. The singular is spelled out for the same reason: « 1 de
 * tes potes ont répondu » is what makes an app look unfinished on a lock screen.
 *
 * Nothing here is read from the question: the day's label already dropped at
 * 07:00, and repeating it in the evening would spoil it a second time to
 * somebody who is being asked to open the app precisely to discover it.
 */
const nudgeBody = (friendsAnswered: number): string => {
  if (friendsAnswered === 0) {
    return 'Ne perds pas ta série : tu as jusqu\'à minuit pour répondre.';
  }

  if (friendsAnswered === 1) {
    return 'Un de tes potes a répondu à la question du jour. Et toi ?';
  }

  return `${friendsAnswered} de tes potes ont répondu à la question du jour. Et toi ?`;
};

const nudgeFor = (date: string, friendsAnswered: number): PushNotification => ({
  title: friendsAnswered === 0 ? 'Tes potes attendent ta réponse' : 'Tes potes ont répondu',
  body: nudgeBody(friendsAnswered),
  channelId: DAILY_QUESTION_CHANNEL_ID,
  // The same payload as the 07:00 drop, on purpose: the tap has the same
  // destination — the day's question — and the app already knows how to read it
  // (`apps/app/src/notifications/helpers/pushRoute.ts`).
  data: { type: 'daily_question', date },
});

/**
 * The other evening line: the one for somebody who has already answered.
 *
 * « Et toi ? » is unanswerable to them, but the friends' answers are exactly
 * what they unlocked by answering (docs/prd.md §4.5), so the push stops being a
 * reminder and becomes an invitation to come and read them. No count in the
 * line: it would be one number at 18:00 and another by the time the day screen
 * opens, and what is being offered is the reading, not the tally.
 *
 * Nobody is pushed when none of their friends has answered — there would be
 * nothing to discover, and they owe no answer of their own.
 */
const discoveryFor = (date: string, friendsAnswered: number): PushNotification | null => {
  if (friendsAnswered === 0) {
    return null;
  }

  return {
    title: 'Tes potes ont répondu',
    body: friendsAnswered === 1
      ? 'Découvre la réponse de ton pote à la question du jour.'
      : 'Découvre la réponse de tes potes à la question du jour.',
    channelId: DAILY_QUESTION_CHANNEL_ID,
    data: { type: 'daily_question', date },
  };
};

/**
 * The 18:00 push: whoever still owes an answer is nudged with the number of
 * their friends who have already given theirs, whoever has answered is sent to
 * read those answers — docs/prd.md §4.5.
 *
 * That count is what makes the evening push worth sending: « la question du
 * jour est toujours ouverte » is a reminder, « 4 de tes potes ont répondu » is
 * the game. So the recipients are computed here rather than by the scheduler,
 * and a retry recounts — an hour-old list would promise a number that is no
 * longer true.
 *
 * Everybody who has not answered is nudged, friends or no friends: the day
 * closes at midnight either way (docs/prd.md §4.6), and a user whose friends
 * are all as late as they are is exactly the one worth waking up. Whoever has
 * answered gets the other line — « Découvre la réponse de tes potes » — since
 * « Et toi ? » is a question only somebody who still owes an answer can be
 * asked, and the friends' answers are what their own answer unlocked.
 *
 * Retried by Cloud Tasks, and the retry re-sends the whole fan-out rather than
 * resuming it, exactly like the 07:00 drop: nothing tracks who already got the
 * push, and a duplicate banner is a smaller failure than a silent evening. The
 * task id is the day's, so the *scheduler* can never enqueue this twice
 * (`helpers/notificationQueue.ts`).
 */
export const notifyFriendsAnswers = onTaskDispatched({
  region: REGION_CLOUD,
  retryConfig: { maxAttempts: 3, minBackoffSeconds: 30 },
  rateLimits: { maxConcurrentDispatches: 5 },
}, async (request) => {
  const payload = payloadSchema.safeParse(request.data);

  if (!payload.success) {
    logger.error('Invalid notifyFriendsAnswers payload, dropping the task', payload.error.issues);

    return;
  }

  const { date, question_id } = payload.data;

  const { answered, friendsAnswered } = await friendsAnswersDigest(question_id);

  const report = await sendPushToUsers((userId) => {
    const friendsCount = friendsAnswered.get(userId) ?? 0;

    return answered.has(userId) ? discoveryFor(date, friendsCount) : nudgeFor(date, friendsCount);
  });

  logger.info('Friends answers nudge sent', { date, question_id, answered: answered.size, ...report });
});
