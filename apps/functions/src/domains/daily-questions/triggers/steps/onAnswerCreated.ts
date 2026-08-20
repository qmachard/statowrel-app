import { FieldValue, Timestamp, type UpdateData } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import {
  type DailyQuestionAnswerData,
  findQuestionOption,
  monthDayKeyOf,
  monthKeyOf,
  QUESTION_COLLECTION,
  questionConverter,
  USER_CALENDAR_MONTH_COLLECTION,
  USER_COLLECTION,
  type UserFirebaseData,
  userCalendarMonthConverter,
  userConverter,
} from '@statowrel/models';

import { getDocumentRef, getSubDocumentRef, parseData, runTransaction } from '@/libs/firebase-admin';

import { nextStreakState } from '../../helpers/streak';

/**
 * The `stat_label` of the option an answer points at — the one the calendar
 * renders inside the answered cell (docs/prd.md §5.2) — or `null` when the
 * question itself does not exist.
 *
 * One read, once per answer, so that displaying a month costs none. A missing
 * option only costs an empty label: a projection without its label is cosmetic,
 * a day missing from the calendar is not. A missing *question* is another
 * matter — `firestore.rules` refuses an answer whose parent was never
 * broadcast, so there is nothing to increment and nothing worth projecting.
 */
const resolveStatLabel = async (questionId: string, date: string, optionId: string): Promise<string | null> => {
  const question = parseData(await getDocumentRef(QUESTION_COLLECTION, questionId, questionConverter).get());

  if (question === null) {
    logger.error('Answer on a question that does not exist', { date, question_id: questionId, option_id: optionId });

    return null;
  }

  const option = findQuestionOption(question.options, optionId);

  if (option === null) {
    logger.error('Answer on an option that is not in the question', {
      date,
      option_id: optionId,
      question_id: questionId,
    });

    return '';
  }

  return option.stat_label;
};

/**
 * Everything one answer changes outside of itself — docs/prd.md §4.6 and §6.
 *
 * Three writes, in one transaction:
 *
 * 1. `answer_counts.{option_id}` on the question, which the card's stat bar and
 *    rarity are computed from (docs/prd.md §5.5);
 * 2. the day's entry in the author's calendar month, the read model the Stats
 *    calendar loads in a single read;
 * 3. the author's counters — `answers_count` always, the streak only when the
 *    answer is on time, since a catch-up completes the calendar without ever
 *    restoring a streak.
 *
 * A Firestore trigger is delivered *at least* once, and two of those three
 * writes are increments, so the whole thing has to be idempotent. The marker is
 * the calendar entry itself: one answer per person per question is guaranteed
 * by the answer document's id, so a day already present in the month means this
 * answer was already applied, and the transaction bails out before writing.
 */
export const onAnswerCreated = async (answer: DailyQuestionAnswerData): Promise<void> => {
  // `question_id`, `date` and `user_id` are denormalized on the answer and
  // pinned to the document path — or to the parent question — by
  // `firestore.rules`, so they can be read straight off it rather than from the
  // trigger's path params.
  const { date, user_id: userId, question_id: questionId, option_id: optionId } = answer;
  const monthKey = monthKeyOf(date);
  const monthDayKey = monthDayKeyOf(date);

  const statLabel = await resolveStatLabel(questionId, date, optionId);

  if (statLabel === null) {
    return;
  }

  const userRef = getDocumentRef(USER_COLLECTION, userId, userConverter);
  const calendarMonthRef = getSubDocumentRef(userRef, USER_CALENDAR_MONTH_COLLECTION, monthKey, userCalendarMonthConverter);
  const questionRef = getDocumentRef(QUESTION_COLLECTION, questionId, questionConverter);

  await runTransaction(async (transaction) => {
    const calendarMonth = (await transaction.get(calendarMonthRef)).data();
    const user = (await transaction.get(userRef)).data();

    if (calendarMonth?.days[monthDayKey] !== undefined) {
      logger.info('Answer already applied, nothing to do', { date, user_id: userId });

      return;
    }

    // A `set` with `merge` deep-merges maps, so writing one `days` entry leaves
    // the rest of the month alone — and re-creates the document on the first
    // answer of the month without a separate check.
    transaction.set(calendarMonthRef, {
      month: monthKey,
      days: {
        [monthDayKey]: {
          option_id: optionId,
          stat_label: statLabel,
          late: answer.late,
        },
      },
      updated_at: answer.answered_at,
    }, { merge: true });

    // A fixed field path plus `increment`, so two answers landing at the same
    // moment add up instead of overwriting each other.
    transaction.update(questionRef, `answer_counts.${optionId}`, FieldValue.increment(1));

    if (user === undefined) {
      // The profile is written at first sign-in and nothing deletes it, so this
      // is a broken account rather than a race — the day is still projected
      // above, only the counters are skipped.
      logger.error('Answer from a user with no profile document', { date, user_id: userId });

      return;
    }

    const counters: UpdateData<UserFirebaseData> = {
      answers_count: FieldValue.increment(1),
      // update() does not run the converter (see the repo's CLAUDE.md), so this
      // is a Timestamp and not an ISO string.
      updated_at: Timestamp.now(),
      ...(answer.late ? {} : nextStreakState(user, date)),
    };

    transaction.update(userRef, counters);
  });
};
