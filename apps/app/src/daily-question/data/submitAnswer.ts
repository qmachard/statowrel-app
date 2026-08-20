import {
  DAILY_QUESTION_ANSWER_COLLECTION,
  type DailyQuestionAnswerData,
  QUESTION_COLLECTION,
  type QuestionData,
  dailyQuestionAnswerConverter,
} from '@statowrel/models';
import { setDoc } from 'firebase/firestore';

import { getSubDocumentRef } from '@/lib/firestore';

export interface SubmitAnswerInput {
  /** Firebase Auth UID — the answer's document id, not a field it carries alone. */
  userId: string;
  /** Document id of the question being answered — the parent the answer is written under. */
  questionId: string;
  /** The question itself, for the `broadcast_on` the answer is dated with and the `closes_at` the `late` flag is decided against. */
  question: QuestionData;
  optionId: string;
}

/**
 * Writes the current user's answer to one day's question — the second tap of
 * docs/prd.md §4.3, and the only thing the app ever writes under a question.
 *
 * **The document id is the author's Firebase Auth UID**, at
 * `v1_questions/{question_id}/v1_daily_question_answers/{uid}`. That is what
 * makes "one answer per person per day" a property of the data rather than a
 * check somebody has to remember — one question is one day — and it is what
 * `firestore.rules` compares to `request.auth.uid`. A `setDoc` on that id can
 * therefore never create a second answer — and never overwrite the first
 * either, since the rules refuse every update.
 *
 * Everything the answer changes elsewhere — `answer_counts`, the calendar
 * month, the streak — belongs to the answer trigger (docs/prd.md §4.6). The app
 * writes one document and stops there.
 *
 * `date` and `late` are both taken from the question rather than recomputed
 * here, because those are the values `firestore.rules` checks them against: the
 * day is the question's own `broadcast_on`, and the deadline its `closes_at`. A
 * device whose clock straddles the close will have its write rejected rather
 * than silently mislabelled — which is the right way round for a flag that
 * decides whether a streak survives.
 */
export const submitAnswer = async ({
  userId,
  questionId,
  question,
  optionId,
}: SubmitAnswerInput): Promise<DailyQuestionAnswerData> => {
  const now = new Date();
  const closesAt = question.closes_at ?? null;

  const answer: DailyQuestionAnswerData = {
    user_id: userId,
    question_id: questionId,
    date: question.broadcast_on ?? '',
    option_id: optionId,
    answered_at: now.toISOString(),
    late: closesAt !== null && now > new Date(closesAt),
  };

  await setDoc(
    getSubDocumentRef(
      QUESTION_COLLECTION,
      questionId,
      DAILY_QUESTION_ANSWER_COLLECTION,
      userId,
      dailyQuestionAnswerConverter,
    ),
    answer,
  );

  return answer;
};
