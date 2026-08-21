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
  /**
   * ISO instant the answer was really given, when that is not now — the
   * onboarding demo's pick, made before there was an account to write it under
   * and flushed at the first sign-in (docs/prd.md §5.6).
   *
   * It stamps `answered_at` and nothing else: `late` stays decided against the
   * clock at write time, because that is the comparison `firestore.rules` runs.
   */
  answeredAt?: string;
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
 *
 * **The onboarding demo goes through here too** (docs/prd.md §5.6), and it is
 * the one question that was never a day: it has no `broadcast_on` to be dated
 * with and no `closes_at` to be late against, so both fields take the value the
 * rules pin them to — an empty day and `late: false`. That is what keeps a
 * demo answer out of every calendar and every streak while still letting it
 * count in the question's own `answer_counts`. This function stays the app's
 * single write under a question rather than growing a twin: what differs is two
 * fields, not a path.
 */
export const submitAnswer = async ({
  userId,
  questionId,
  question,
  optionId,
  answeredAt,
}: SubmitAnswerInput): Promise<DailyQuestionAnswerData> => {
  const now = new Date();
  const closesAt = question.closes_at ?? null;
  const isDemo = question.status === 'demo';

  const answer: DailyQuestionAnswerData = {
    user_id: userId,
    question_id: questionId,
    date: isDemo ? '' : question.broadcast_on ?? '',
    option_id: optionId,
    answered_at: answeredAt ?? now.toISOString(),
    late: isDemo ? false : closesAt !== null && now > new Date(closesAt),
    // The answer trigger's marker, and its alone.
    counted_at: null,
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
