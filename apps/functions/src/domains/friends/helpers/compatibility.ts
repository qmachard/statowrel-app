import {
  COMPATIBILITY_WINDOW,
  DAILY_QUESTION_ANSWER_COLLECTION,
  type DailyQuestionAnswerData,
  compatibilityScoreOf,
  dailyQuestionAnswerConverter,
} from '@statowrel/models';

import { getCollectionGroupRef } from '@/libs/firebase-admin';

/** What comparing two histories yields — the three numbers the cache document stores. */
export interface CompatibilityTally {
  common_days: number;
  matching_days: number;
  score: number;
}

/**
 * One account's most recent answers, newest first.
 *
 * A collection-group query on `v1_daily_question_answers`, which is a read no
 * client is allowed to make: `firestore.rules` scopes that group to
 * `isOwner(resource.data.user_id)` so that reading a friend's day never becomes
 * reading their history. Here it runs admin-side, and what comes back out is a
 * count rather than the answers themselves.
 *
 * Ordered on `date` and capped at `COMPATIBILITY_WINDOW`, which the composite
 * index in `packages/firestore-config/firestore.indexes.json` (`user_id` +
 * `date`) already backs — descending is the same index read the other way.
 */
const recentAnswersOf = async (userId: string): Promise<DailyQuestionAnswerData[]> => {
  const snapshot = await getCollectionGroupRef(DAILY_QUESTION_ANSWER_COLLECTION, dailyQuestionAnswerConverter)
    .where('user_id', '==', userId)
    .orderBy('date', 'desc')
    .limit(COMPATIBILITY_WINDOW)
    .get();

  return snapshot.docs.map((document) => document.data());
};

/**
 * The picks worth comparing, by question — what a day of this account is an
 * opinion about.
 *
 * Two kinds of answer are dropped, both because there is no opinion in them to
 * agree with. A **joker** (docs/prd.md §4.8) picked nothing: it is « done » for
 * the streak and for the friends' badge, but counting it as a disagreement
 * would punish a day somebody paid to skip. The **onboarding demo** was never a
 * day — it carries an empty `date`, everybody answers it, and it would put a
 * free point of agreement in every pair.
 */
const picksOf = (answers: DailyQuestionAnswerData[]): Map<string, string> => {
  const picks = new Map<string, string>();

  answers.forEach((answer) => {
    if (answer.is_joker || answer.date === '' || answer.option_id === '') {
      return;
    }

    picks.set(answer.question_id, answer.option_id);
  });

  return picks;
};

/**
 * How alike two accounts answered — docs/prd.md §5.3.
 *
 * The intersection of the two histories by question, and within it the share of
 * days that picked the same option. A **raw agreement rate**: see
 * `v1_friend_compatibility.ts` on why it is not corrected for how many options
 * each question offered.
 *
 * The two reads are issued together — they do not depend on each other, and the
 * whole callable is one round trip a screen is waiting on.
 */
export const compatibilityBetween = async (userId: string, friendId: string): Promise<CompatibilityTally> => {
  const [ own, friend ] = await Promise.all([
    recentAnswersOf(userId).then(picksOf),
    recentAnswersOf(friendId).then(picksOf),
  ]);

  // Walked from whichever side is shorter: the result is the same either way,
  // and the intersection cannot be bigger than the smaller history.
  const [ shorter, longer ] = own.size <= friend.size ? [ own, friend ] : [ friend, own ];

  let commonDays = 0;
  let matchingDays = 0;

  shorter.forEach((optionId, questionId) => {
    const other = longer.get(questionId);

    if (other === undefined) {
      return;
    }

    commonDays += 1;

    if (other === optionId) {
      matchingDays += 1;
    }
  });

  return {
    common_days: commonDays,
    matching_days: matchingDays,
    score: compatibilityScoreOf(matchingDays, commonDays),
  };
};
