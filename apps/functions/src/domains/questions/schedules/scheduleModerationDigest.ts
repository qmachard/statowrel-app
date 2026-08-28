import { logger } from 'firebase-functions/v2';
import { onSchedule } from 'firebase-functions/v2/scheduler';

import { DAILY_QUESTION_TIME_ZONE } from '@statowrel/models';

import { RESEND_API_KEY, listAdminEmails, sendEmails } from '@/domains/notifications';
import { REGION_CLOUD } from '@/libs/firebase-admin';

import { buildModerationDigest } from '../helpers/moderationDigest';
import { listPendingQuestions } from '../helpers/pendingQuestions';

/**
 * Paris hour the digest goes out at.
 *
 * An hour after the daily draw, not with it: the 07:00 run turns an `approved`
 * question into the day's, and a moderator reading the pot at 08:00 is reading
 * the one the morning actually left behind. Backend-only, so it stays here
 * rather than in `@statowrel/models` — no screen has an opinion about it.
 */
const MODERATION_DIGEST_HOUR = 8;

/**
 * Mails the moderators every morning when questions are waiting on them, and
 * nothing at all when none are.
 *
 * The moderation pot is the one part of the product with no screen watching it:
 * a question proposed from the app (docs/prd.md §4.7) costs its author 100§ and
 * sits `pending` until somebody opens the console, which nothing today asks
 * anybody to do. This is that ask.
 *
 * **An empty pot sends nothing.** Not an empty digest, not a « rien à
 * modérer » — a daily mail that is usually empty is a daily mail nobody opens,
 * and the one morning it matters would be read as the same noise.
 *
 * It repeats: a question left pending is mailed about again tomorrow. That is
 * the point of a digest rather than a per-proposal notification — the count is
 * a backlog, and a backlog that stops nagging stops working.
 */
export const scheduleModerationDigest = onSchedule({
  region: REGION_CLOUD,
  schedule: `0 ${MODERATION_DIGEST_HOUR} * * *`,
  timeZone: DAILY_QUESTION_TIME_ZONE,
  // Bound here rather than in the transport: a secret is only readable by the
  // functions that declare it, and this is the one function that sends mail.
  secrets: [ RESEND_API_KEY ],
}, async () => {
  const questions = await listPendingQuestions();

  if (questions.length === 0) {
    logger.info('Nothing waiting for moderation, no digest sent');

    return;
  }

  const recipients = await listAdminEmails();

  if (recipients.length === 0) {
    // Worth a `warn` and not an `info`: questions are piling up and the claim
    // that would let somebody hear about it has been granted to nobody
    // (`npm run set-admin -- <email>`).
    logger.warn('Questions are waiting for moderation but no admin can be mailed', {
      pending: questions.length,
    });

    return;
  }

  // Nothing catches this. `onSchedule` does not retry by default, so a refused
  // send is one failed run, red in the logs — which is what a misconfigured
  // sender should look like, rather than a morning that quietly resembles an
  // empty pot.
  await sendEmails(buildModerationDigest(questions, recipients));

  logger.info('Moderation digest sent', { pending: questions.length, recipients: recipients.length });
});
