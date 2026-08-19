import {
  type DailyQuestionData,
  type Identifiable,
  QUESTION_COLLECTION,
  type QuestionData,
  questionConverter,
} from '@statowrel/models';
import { Timestamp } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';

import { getDocumentRef, parseData } from '@/libs/firebase-admin';

import { dailyQuestionMonthRefOf, forgetIndexedDay, monthIndexOf, readIndexedDay } from '../../helpers/monthIndex';

/**
 * Marks the question a day points at as broadcast — `status` and, above all,
 * `broadcast_at`, which is what `firestore.rules` gates reading a question on:
 * an unstamped question is unreadable to the app, so the day would open on
 * « Pas de question ce jour-là » even once the calendar shows it.
 *
 * Stamped with the day's own `published_at` rather than the clock, so replaying
 * this recomputes the same instant. A question already stamped is left alone —
 * re-dating a broadcast is not this step's business, and a day whose
 * `question_id` is repointed leaves the previous question `used`: it did reach
 * people, and it must not fall back into the pot.
 */
const markBroadcast = async (question: Identifiable<QuestionData>, publishedAt: string): Promise<void> => {
  if (question.broadcast_at !== null && question.status === 'used') {
    return;
  }

  // update() does not run the converter (see the repo's CLAUDE.md), so this is
  // a Timestamp and not an ISO string.
  await getDocumentRef(QUESTION_COLLECTION, question.id, questionConverter).update({
    status: 'used',
    broadcast_at: Timestamp.fromDate(new Date(publishedAt)),
  });
};

/**
 * Everything a day document owes the rest of the app — the twin of
 * `onAnswerCreated`, one level up.
 *
 * The Stats calendar (docs/prd.md §5.2) never reads `v1_daily_questions`: it
 * reads the month index, one document for the whole month, which is what lets
 * it tell a missed day from a day that never had a question without a read per
 * day. So a day that exists but isn't indexed is a day nobody can see, and
 * nobody can catch up on.
 *
 * The 07:00 scheduler indexes the day it draws in the same batch — atomically,
 * so the calendar is right the instant the day exists. This step is what covers
 * every *other* way a day appears: a moderator filling one in the backoffice
 * (which `v1_daily_questions` is explicitly there for, as long as the schedule
 * is being run by hand), a backfill, or a scheduler run retried after its first
 * attempt already committed the day.
 *
 * It is a projection, so it is idempotent and self-healing: it re-derives the
 * index entry from the day document and writes only when the two disagree.
 * Which is also what keeps it cheap — the answer trigger bumps `answer_counts`
 * on this same document at every answer, and each of those bumps lands here.
 */
export const onDayWritten = async (date: string, day: DailyQuestionData | null): Promise<void> => {
  if (day === null) {
    await forgetIndexedDay(date);

    return;
  }

  const indexed = await readIndexedDay(date);

  if (indexed?.question_id === day.question_id) {
    return;
  }

  const question = parseData(await getDocumentRef(QUESTION_COLLECTION, day.question_id, questionConverter).get());

  if (question === null) {
    // Deliberately left out of the index: a day pointing at nothing is a day
    // with no question to answer, which docs/prd.md §5.2 renders as inert
    // rather than as a broken catch-up.
    logger.error('Daily question points at a question that does not exist — day left out of the calendar', {
      date,
      question_id: day.question_id,
    });

    return;
  }

  await dailyQuestionMonthRefOf(date).set(
    monthIndexOf(date, { question_id: question.id, label: question.label }, day.published_at),
    { merge: true },
  );

  await markBroadcast(question, day.published_at);

  logger.info('Daily question indexed in its month', { date, question_id: question.id });
};
