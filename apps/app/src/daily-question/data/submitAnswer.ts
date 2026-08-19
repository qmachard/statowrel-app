import {
  DAILY_QUESTION_ANSWER_COLLECTION,
  DAILY_QUESTION_COLLECTION,
  type DailyQuestionAnswerData,
  type DailyQuestionData,
  dailyQuestionAnswerConverter,
} from '@statowrel/models';
import { setDoc } from 'firebase/firestore';

import { getSubDocumentRef } from '@/lib/firestore';

export interface SubmitAnswerInput {
  /** Firebase Auth UID — the answer's document id, not a field it carries alone. */
  userId: string;
  /** `YYYY-MM-DD`, the day document's id. */
  date: string;
  optionId: string;
  /** The day being answered, for the `closes_at` the `late` flag is decided against. */
  dailyQuestion: DailyQuestionData;
}

/**
 * Writes the current user's answer to one day — the second tap of docs/prd.md
 * §4.3, and the only thing the app ever writes under a daily question.
 *
 * **The document id is the author's Firebase Auth UID**, at
 * `v1_daily_questions/{date}/v1_daily_question_answers/{uid}`. That is what
 * makes "one answer per person per day" a property of the data rather than a
 * check somebody has to remember, and it is what `firestore.rules` compares to
 * `request.auth.uid`. A `setDoc` on that id can therefore never create a second
 * answer — and never overwrite the first either, since the rules refuse every
 * update.
 *
 * Everything the answer changes elsewhere — `answer_counts`, the calendar
 * month, the streak — belongs to the answer trigger (docs/prd.md §4.6). The app
 * writes one document and stops there.
 *
 * `late` is computed against the day's own `closes_at` rather than against
 * Paris midnight recomputed here, because that is the value `firestore.rules`
 * checks the flag against. A device whose clock straddles the close will have
 * its write rejected rather than silently mislabelled — which is the right way
 * round for a flag that decides whether a streak survives.
 */
export const submitAnswer = async ({
  userId,
  date,
  optionId,
  dailyQuestion,
}: SubmitAnswerInput): Promise<DailyQuestionAnswerData> => {
  const now = new Date();

  const answer: DailyQuestionAnswerData = {
    user_id: userId,
    date,
    option_id: optionId,
    answered_at: now.toISOString(),
    late: now > new Date(dailyQuestion.closes_at),
  };

  await setDoc(
    getSubDocumentRef(
      DAILY_QUESTION_COLLECTION,
      date,
      DAILY_QUESTION_ANSWER_COLLECTION,
      userId,
      dailyQuestionAnswerConverter,
    ),
    answer,
  );

  return answer;
};
