import {
  type FirestoreConverter,
  type ModelData,
  type UniversalTimestamp,
  parseTimestamp,
  removeMissingFields,
} from './commons';

/**
 * Sub-collection of `v1_questions`, at
 * `v1_questions/{question_id}/v1_daily_question_answers/{user_id}`.
 *
 * A sub-collection carries the `v1_` prefix and a globally unique name for a
 * reason the top-level collections don't have: a collection group is global to
 * the database and keyed by the last path segment alone. A bare `answers` would
 * collide with any other `answers` sub-collection added later — the calendar's
 * collection-group query and its index would silently span both — and there
 * would be no way to version this one on its own.
 *
 * The name says `daily_question` rather than its parent's `question` on
 * purpose: what it holds is an answer to the question **as the daily question**
 * — it exists only for a question that was broadcast, and carries the `date`
 * and `late` of that broadcast. A question sitting in the moderation pot has no
 * answers.
 */
export const DAILY_QUESTION_ANSWER_COLLECTION = 'v1_daily_question_answers';

/**
 * One user's answer to one question — see docs/prd.md §6.
 *
 * The document id is the author's Firebase Auth UID. That is what makes "one
 * answer per person per day" a property of the data rather than a check
 * somebody has to remember: there is no second document to create, and
 * `firestore.rules` compares the id to `request.auth.uid` to reject answering
 * for someone else. An answer is never updated nor deleted — the choice is
 * final (docs/prd.md §4.2).
 */
export interface DailyQuestionAnswerFirebaseData {
  /** Firebase Auth UID of the author, same value as the document id. Carried as a field so the collection-group query can filter on it. */
  user_id: string;
  /** Document id of the parent question, denormalized so an answer read on its own — from a collection-group query, or by the answer trigger — knows what it answers. */
  question_id: string;
  /**
   * `YYYY-MM-DD` day key, copied from the parent question's `broadcast_on`.
   *
   * The Stats calendar (docs/prd.md §5.2) reads a month of the current user's
   * answers. With this field it is one collection-group query on
   * `v1_daily_question_answers` — `user_id ==` + `date` range, backed by the
   * composite index in `packages/firestore-config` — instead of a query joined
   * against a month of questions client-side. A question is broadcast once and
   * never rebroadcast, so the copy never goes stale.
   */
  date: string;
  /** `QuestionOptionFirebaseData.id` of the picked option — never its position in the array. */
  option_id: string;
  answered_at: UniversalTimestamp;
  /**
   * True for a catch-up answer, given after the day closed (docs/prd.md §4.2).
   * It completes the calendar and unlocks the card, but never restores the
   * streak — which is why the flag is stored rather than recomputed from
   * `answered_at` at display time.
   */
  late: boolean;
}

export type DailyQuestionAnswerData = ModelData<DailyQuestionAnswerFirebaseData>;

export const dailyQuestionAnswerConverter: FirestoreConverter<DailyQuestionAnswerData, DailyQuestionAnswerFirebaseData> = (TimestampClass) => ({
  toFirestore: (data) => removeMissingFields({
    user_id: data.user_id,
    question_id: data.question_id,
    date: data.date,
    option_id: data.option_id,
    answered_at: TimestampClass.fromDate(new Date(data.answered_at)),
    late: data.late,
  }),
  fromFirestore: (snap) => {
    const data = snap.data();

    return {
      user_id: data.user_id ?? '',
      question_id: data.question_id ?? '',
      date: data.date ?? '',
      option_id: data.option_id ?? '',
      answered_at: parseTimestamp(data.answered_at ?? null, 'now'),
      late: data.late ?? false,
    };
  },
});
