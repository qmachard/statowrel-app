import { logger } from 'firebase-functions/v2';
import {
  DAILY_QUESTION_CHANNEL_ID,
  MY_QUESTION_CHANNEL_ID,
  QUESTION_COLLECTION,
  type QuestionData,
  isPlayerProposal,
  leadingAnswer,
  previousDateKey,
  questionConverter,
  statLabelOf,
} from '@statowrel/models';

import type { PushNotification } from '@/domains/notifications';
import { getDocumentRef, parseData } from '@/libs/firebase-admin';

import { scheduledQuestionOf } from './monthIndex';

/**
 * The two lines the 07:00 fan-out owes an author, and who they are owed to —
 * docs/prd.md §4.7.
 *
 * **Neither of them is a Cloud Function.** `notifyDailyQuestion` already fans
 * out to every registered device once a morning, and `sendPushToUsers` already
 * resolves one notification per user — that is what lets the 18:00 nudge give
 * everybody a different count. So the author's morning is two entries in a map
 * the drop consults, not a scheduler, not a trigger, and not a second push
 * landing on the same lock screen a second later: an author gets **one** line
 * at 07:00, theirs, in the slot the generic one would have taken.
 *
 * Which is also the priority rule. Somebody who wrote today's question *and*
 * yesterday's gets today's — a question being posed right now beats a tally
 * that has stopped moving.
 */
export interface AuthorNotifications {
  /** UID → the line that replaces the generic drop for that account. Empty on an ordinary morning. */
  lines: Map<string, PushNotification>;
  /** What the log says — the two authors resolved, so a silent morning can be told from a morning with no author. */
  report: { drawn_author: string | null; recap_author: string | null };
}

/**
 * What the author of the question being posed this morning is told, instead of
 * « La question du jour est tombée ».
 *
 * It travels on `DAILY_QUESTION_CHANNEL_ID` and not on the author channel, and
 * that is deliberate: this *is* the day's drop, worded for the one person it
 * belongs to. Posting it on « Mes questions » would mean somebody who silenced
 * the moderation verdicts loses the morning their own question runs, which is
 * the last morning they would have wanted to miss.
 */
const drawnLine = (date: string, question: QuestionData): PushNotification => ({
  title: 'Ta question est tombée',
  // The title has already said whose question it is, so the body says the one
  // thing left — who is answering it. « Tout le monde » and not « toute l'app »:
  // an author is looking for people, not for a product.
  body: `« ${question.label} » — tout le monde y répond aujourd'hui.`,
  channelId: DAILY_QUESTION_CHANNEL_ID,
  data: { type: 'daily_question', date },
});

/**
 * The tally yesterday's question left, the morning after it closed — the third
 * and, of the three, the one an author actually writes a question for.
 *
 * The number is read off `answer_counts`, which is final by now: the day closed
 * at Paris midnight (docs/prd.md §4.6), so nothing has moved it since. The
 * leading option comes with it, because « 240 réponses » is a volume and
 * « 61 % ont choisi X » is the result — a stat is what the app is for.
 *
 * **Nothing is sent when nobody answered.** « 0 personne a répondu à ta
 * question » is the one sentence that makes proposing another one unthinkable,
 * and the author would rather hear nothing at all. The generic drop reaches
 * them instead, since this returns null and the fan-out falls back to it.
 */
const recapLine = (date: string, question: QuestionData): PushNotification | null => {
  const leader = leadingAnswer(question);

  if (leader === null) {
    return null;
  }

  const { option, count, total } = leader;
  const share = Math.round((count / total) * 100);

  return {
    title: 'Ta question a fait parler',
    body: total === 1
      ? `Une personne a répondu à ta question hier, et c'était « ${statLabelOf(option)} ».`
      : `${total} personnes ont répondu à ta question hier. ${share} % sont des « ${statLabelOf(option)} ».`,
    channelId: MY_QUESTION_CHANNEL_ID,
    // The day it ran, not today's: the tap opens the sheet the tally belongs
    // to, where the author reads the whole breakdown rather than one line of it.
    data: { type: 'daily_question', date },
  };
};

/**
 * The question that ran a day, read through the month index — two reads, and
 * only for the day *before* the one being published: today's question is
 * already in the caller's hand.
 */
const questionOfDay = async (date: string): Promise<QuestionData | null> => {
  const scheduled = await scheduledQuestionOf(date);

  if (scheduled === null) {
    return null;
  }

  return await getDocumentRef(QUESTION_COLLECTION, scheduled.question_id, questionConverter).get().then(parseData);
};

/**
 * Resolves both author lines for the morning of `date` — docs/prd.md §4.7.
 *
 * Costs at most two Firestore reads a day, on top of the one the drop already
 * makes: the month index for yesterday, then yesterday's question. Today's
 * question is passed in because the task has just read it for its own body.
 *
 * **Only a paid proposal has an author here**, `isPlayerProposal` deciding on
 * `statcoin_cost`: a seeded catalogue entry is credited to whoever `--author`
 * named and the onboarding demo to somebody, and neither of them wrote it.
 *
 * Never throws. A morning whose recap cannot be resolved is a morning where the
 * author gets the ordinary drop, which is what everybody else gets — worth a
 * log line, never worth failing the fan-out that wakes the whole app.
 */
export const resolveAuthorNotifications = async (
  date: string,
  question: QuestionData | null,
): Promise<AuthorNotifications> => {
  const lines = new Map<string, PushNotification>();
  const report = { drawn_author: null as string | null, recap_author: null as string | null };

  try {
    const yesterday = previousDateKey(date);
    const previous = await questionOfDay(yesterday);

    if (previous !== null && isPlayerProposal(previous)) {
      const recap = recapLine(yesterday, previous);

      if (recap !== null) {
        lines.set(previous.author_id, recap);
        report.recap_author = previous.author_id;
      }
    }

    // Set last, so it overwrites the recap for somebody who wrote both days:
    // a question being posed right now beats a tally that has stopped moving,
    // and either way they get one banner and not two.
    if (question !== null && isPlayerProposal(question)) {
      lines.set(question.author_id, drawnLine(date, question));
      report.drawn_author = question.author_id;

      if (report.recap_author === question.author_id) {
        report.recap_author = null;
      }
    }
  } catch (error: unknown) {
    logger.error('Could not resolve the author notifications, sending the ordinary drop to everyone', { date, error });
  }

  return { lines, report };
};
