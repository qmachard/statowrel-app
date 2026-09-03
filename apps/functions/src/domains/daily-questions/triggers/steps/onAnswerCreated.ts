import { FieldValue, Timestamp, type UpdateData } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import {
  DAILY_QUESTION_ANSWER_COLLECTION,
  dailyQuestionAnswerConverter,
  type DailyQuestionAnswerData,
  findQuestionOption,
  monthDayKeyOf,
  statLabelOf,
  monthKeyOf,
  QUESTION_COLLECTION,
  questionConverter,
  streakStatflouzzReward,
  USER_CALENDAR_MONTH_COLLECTION,
  USER_COLLECTION,
  type QuestionData,
  type UserFirebaseData,
  userCalendarMonthConverter,
  userConverter,
} from '@statowrel/models';

import { getDocumentRef, getSubDocumentRef, parseData, runTransaction } from '@/libs/firebase-admin';

import { fanOutFriendAnswerBadge } from '../../helpers/friendsAnswers';
import { nextStreakState } from '../../helpers/streak';

/**
 * The StatOwrel of the option an answer points at — the one the calendar
 * renders inside the answered cell (docs/prd.md §5.2).
 *
 * Through `statLabelOf`, so an option posed without a StatOwrel — it is
 * optional (docs/prd.md §4.7) — projects the option's own label rather than an
 * empty string, which is what the day screen shows for the same answer.
 *
 * A missing option only costs an empty label: a projection without its label is
 * cosmetic, a day missing from the calendar is not.
 */
const resolveStatLabel = (question: QuestionData, date: string, optionId: string): string => {
  const option = findQuestionOption(question.options, optionId);

  if (option === null) {
    logger.error('Answer on an option that is not in the question', {
      date,
      option_id: optionId,
      question_id: question.label,
    });

    return '';
  }

  return statLabelOf(option);
};

/**
 * The onboarding demo (docs/prd.md §5.6): the one answer that changes nothing
 * but the question's own tally.
 *
 * It is deliberately **not** a day. Projecting it into the author's calendar
 * would check the cell of whatever day they signed up on — hiding that day's
 * real question behind a sample they never answered — and moving the streak
 * would hand out a first day for free. So the counters and the calendar are
 * both skipped, and what is left is the share the next visitor is shown. Not
 * being a day, it is not something anybody's friends are told about either:
 * there is no fan-out here.
 *
 * A trigger is delivered at least once, so the increment needs a marker to bail
 * out on. A broadcast answer has one for free — its calendar entry, read in the
 * same transaction below — and this one has none, hence `counted_at` on the
 * answer itself, written here and nowhere else.
 */
const countDemoAnswer = async (answer: DailyQuestionAnswerData): Promise<void> => {
  const { user_id: userId, question_id: questionId, option_id: optionId } = answer;

  const questionRef = getDocumentRef(QUESTION_COLLECTION, questionId, questionConverter);
  const answerRef = getSubDocumentRef(
    questionRef,
    DAILY_QUESTION_ANSWER_COLLECTION,
    userId,
    dailyQuestionAnswerConverter,
  );

  await runTransaction(async (transaction) => {
    const counted = (await transaction.get(answerRef)).data()?.counted_at ?? null;

    if (counted !== null) {
      logger.info('Demo answer already counted, nothing to do', { user_id: userId, question_id: questionId });

      return;
    }

    transaction.update(questionRef, `answer_counts.${optionId}`, FieldValue.increment(1));
    // update() does not run the converter (see the repo's CLAUDE.md), so this
    // is a Timestamp and not an ISO string.
    transaction.update(answerRef, { counted_at: Timestamp.now() });
  });
};

/**
 * Everything one answer changes about the author and the question — docs/prd.md
 * §4.6 and §6.
 *
 * Four writes, in one transaction, and only those that have to be atomic:
 *
 * 1. `answer_counts.{option_id}` on the question, which the card's stat bar and
 *    rarity are computed from (docs/prd.md §5.5), and `counted_at` on the
 *    answer that was just folded into it — see below;
 * 2. the day's entry in the author's calendar month, the read model the Stats
 *    calendar loads in a single read;
 * 3. the author's counters — `answers_count` always, the streak only when the
 *    answer is on time, since a catch-up completes the calendar without ever
 *    restoring a streak, and the StatFlouzz that streak just earned when it crossed
 *    a milestone (docs/prd.md §4.7). The payout rides in this transaction
 *    rather than in a trigger of its own: the balance is money, and money that
 *    can be credited without the streak that owes it can also be credited
 *    twice.
 *
 * The friends' badge is **not** among them — it is fanned out afterwards, see
 * `countAnswerOntoFriends` for why it does not belong here.
 *
 * **`counted_at` is what lets the app know its own answer has landed in the
 * tally.** The day screen reads the question once, at the door, and never
 * subscribes to it (`useDailyQuestion`), so it has to decide on its own whether
 * the `answer_counts` it holds already carry the answer just written — a
 * percentage computed on a tally that is one short of the truth is off by a
 * whole answer, which shows on a quiet morning. Stamped here, in the very
 * transaction that increments, the marker cannot say yes before the increment
 * exists: the app reads the question first and its own answer second, so a
 * marker still absent on the second read proves the tally of the first was
 * taken without it, and the app folds itself in. It never overstates, which is
 * the property that matters — the other way round would count somebody twice.
 *
 * The trigger does not need it: its own idempotency marker is the calendar
 * entry below. The demo has needed one since it exists — it is projected into
 * no calendar — and this generalizes it to every answer rather than keeping it
 * an exception.
 *
 * The onboarding demo takes the first of those four and none of the others —
 * see `countDemoAnswer`.
 *
 * A Firestore trigger is delivered *at least* once, and the writes are
 * increments, so the whole thing has to be idempotent. The marker is the
 * calendar entry itself: one answer per person per question is guaranteed by
 * the answer document's id, so a day already present in the month means this
 * answer was already applied, and the transaction bails out before writing.
 * What it returns says which of the two happened, and that is what the fan-out
 * below hangs off — a redelivery counts nothing onto anybody a second time,
 * without needing a marker of its own.
 */
export const onAnswerCreated = async (answer: DailyQuestionAnswerData): Promise<void> => {
  // `question_id`, `date` and `user_id` are denormalized on the answer and
  // pinned to the document path — or to the parent question — by
  // `firestore.rules`, so they can be read straight off it rather than from the
  // trigger's path params.
  const { date, user_id: userId, question_id: questionId, option_id: optionId } = answer;
  const monthKey = monthKeyOf(date);
  const monthDayKey = monthDayKeyOf(date);

  // One read, once per answer, so that displaying a month costs none.
  // `firestore.rules` refuses an answer whose parent was never broadcast — bar
  // the demo, which is what the branch below is for — so a missing question
  // leaves nothing to increment and nothing worth projecting.
  const question = parseData(await getDocumentRef(QUESTION_COLLECTION, questionId, questionConverter).get());

  if (question === null) {
    logger.error('Answer on a question that does not exist', { date, question_id: questionId, option_id: optionId });

    return;
  }

  if (question.status === 'demo') {
    await countDemoAnswer(answer);

    return;
  }

  const statLabel = resolveStatLabel(question, date, optionId);

  const userRef = getDocumentRef(USER_COLLECTION, userId, userConverter);
  const calendarMonthRef = getSubDocumentRef(userRef, USER_CALENDAR_MONTH_COLLECTION, monthKey, userCalendarMonthConverter);
  const questionRef = getDocumentRef(QUESTION_COLLECTION, questionId, questionConverter);
  const answerRef = getSubDocumentRef(questionRef, DAILY_QUESTION_ANSWER_COLLECTION, userId, dailyQuestionAnswerConverter);

  const applied = await runTransaction(async (transaction) => {
    // Every read first: a transaction refuses to read after it has written.
    const calendarMonth = (await transaction.get(calendarMonthRef)).data();
    const user = (await transaction.get(userRef)).data();

    if (calendarMonth?.days[monthDayKey] !== undefined) {
      logger.info('Answer already applied, nothing to do', { date, user_id: userId });

      return false;
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

    // Same transaction as that increment, and it has to stay that way: the
    // marker is only worth anything because it cannot exist without the count
    // it announces. update() does not run the converter (see the repo's
    // CLAUDE.md), so this is a Timestamp and not an ISO string.
    transaction.update(answerRef, { counted_at: Timestamp.now() });

    if (user === undefined) {
      // The profile is written at first sign-in and nothing deletes it, so this
      // is a broken account rather than a race — the day is still projected
      // above, only the counters are skipped.
      logger.error('Answer from a user with no profile document', { date, user_id: userId });

      return true;
    }

    // A catch-up answer completes the calendar and leaves the streak where it
    // was (docs/prd.md §4.6) — so it earns nothing either: the StatFlouzz follow
    // the streak, and there is no streak to follow here.
    const streak = answer.late ? null : nextStreakState(user, date);
    const reward = streak === null ? 0 : streakStatflouzzReward(user.streak_count, streak.streak_count);

    const counters: UpdateData<UserFirebaseData> = {
      answers_count: FieldValue.increment(1),
      // update() does not run the converter (see the repo's CLAUDE.md), so this
      // is a Timestamp and not an ISO string.
      updated_at: Timestamp.now(),
      ...(streak ?? {}),
      // The milestone payout of docs/prd.md §4.7, credited in the very
      // transaction that moves the streak it is owed to — the two cannot
      // disagree, and the redelivery this trigger has to survive bails out well
      // before here on the calendar entry above. `increment` rather than a
      // computed total for the usual reason: the balance is also moved by
      // spending it, and this write must not carry back a value read a moment
      // ago.
      ...(reward > 0
        ? { statcoin_balance: FieldValue.increment(reward), statcoins_earned: FieldValue.increment(reward) }
        : {}),
    };

    transaction.update(userRef, counters);

    if (reward > 0) {
      logger.info('Streak milestone reached, StatFlouzz credited', {
        date,
        streak: streak?.streak_count,
        statflouzz: reward,
        user_id: userId,
      });
    }

    return true;
  });

  if (!applied) {
    return;
  }

  await fanOutFriendAnswerBadge(userRef, monthKey, monthDayKey, date);
};
