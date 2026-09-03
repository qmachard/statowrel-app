import {
  type FirestoreConverter,
  type ModelData,
  type UniversalTimestamp,
  parseTimestamp,
  removeMissingFields,
} from './commons';

/**
 * Sub-collection of `v1_questions`, at
 * `v1_questions/{question_id}/v1_daily_question_jokers/{user_id}` — the
 * source-of-truth mirror of `v1_daily_question_answers`, for a day the user
 * *skipped* with a joker rather than answering (docs/prd.md §4.8).
 *
 * A dedicated sub-collection rather than a `type: 'joker'` on the answer above,
 * for two reasons that both point the same way: the rules already refuse an
 * answer whose `option_id` is empty (and there is no option to pick when the
 * day is skipped), and the question's `answer_counts` would need a discriminant
 * to avoid a joker inflating the tally. Keeping the two collections apart makes
 * both problems disappear.
 *
 * The name follows the `v1_daily_question_answers` rule: `v1_` prefix, globally
 * unique last path segment — a collection group is keyed by that segment alone
 * — and `daily_question` in the name, since a joker is spent on a broadcast
 * day of the daily cycle.
 *
 * The document id is the user's UID, so « one joker per person per question »
 * is a property of the data. `firestore.rules` denies every client write on
 * this collection outright: the `questions-useJoker` callable is the only
 * writer, admin-side, past those rules — because the debit and the write must
 * be one operation.
 */
export const DAILY_QUESTION_JOKER_COLLECTION = 'v1_daily_question_jokers';

/**
 * One user's joker on one question — see docs/prd.md §4.8.
 *
 * Mirrors the shape of `DailyQuestionAnswerFirebaseData` in every field that
 * still makes sense for a skip: no `option_id`, no `late` (a joker is only ever
 * spent on today's still-open question), no `counted_at` (the question's own
 * `answer_counts` are left alone).
 */
export interface DailyQuestionJokerFirebaseData {
  /** Firebase Auth UID of the user, same value as the document id — carried as a field so the collection-group query can filter on it. */
  user_id: string;
  /** Document id of the parent question, denormalized like on `DailyQuestionAnswerFirebaseData`. */
  question_id: string;
  /**
   * `YYYY-MM-DD` day key, copied from the parent question's `broadcast_on` —
   * the day the joker was spent on. Same rule as on an answer: read once by
   * every future consumer without joining back to the question.
   */
  date: string;
  used_at: UniversalTimestamp;
}

export type DailyQuestionJokerData = ModelData<DailyQuestionJokerFirebaseData>;

export const dailyQuestionJokerConverter: FirestoreConverter<DailyQuestionJokerData, DailyQuestionJokerFirebaseData> = (TimestampClass) => ({
  toFirestore: (data) => removeMissingFields({
    user_id: data.user_id,
    question_id: data.question_id,
    date: data.date,
    used_at: TimestampClass.fromDate(new Date(data.used_at)),
  }),
  fromFirestore: (snap) => {
    const data = snap.data();

    return {
      user_id: data.user_id ?? '',
      question_id: data.question_id ?? '',
      date: data.date ?? '',
      used_at: parseTimestamp(data.used_at ?? null, 'now'),
    };
  },
});
