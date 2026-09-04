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
 * — it exists for a question that was broadcast, and carries the `date` and
 * `late` of that broadcast. A question sitting in the moderation pot has no
 * answers.
 *
 * The one exception is the onboarding demo (docs/prd.md §5.6), which is
 * answered by everybody who installs the app and was never a day: its answers
 * carry an empty `date` and a `late` of false, and count in nothing but the
 * question's own `answer_counts`.
 */
export const DAILY_QUESTION_ANSWER_COLLECTION = 'v1_daily_question_answers';

/**
 * One user's answer to one question — see docs/prd.md §6, §4.8.
 *
 * The document id is the author's Firebase Auth UID. That is what makes "one
 * answer per person per day" a property of the data rather than a check
 * somebody has to remember: there is no second document to create, and
 * `firestore.rules` compares the id to `request.auth.uid` to reject answering
 * for someone else. **No client ever updates or deletes one** — the choice is
 * final (docs/prd.md §4.2). The answer trigger writes to it exactly once, to
 * stamp `counted_at`; nothing else ever rewrites an answer.
 *
 * **A joker (docs/prd.md §4.8) is stored here too**, with `is_joker: true`
 * and an empty `option_id`. Two collections were considered and rejected:
 * every consumer of a friend's day (`useFriendAnswers`, the 18:00 nudge)
 * would double its reads for a signal that fits in one bit. The two paths
 * share the same document id (« one action per person per day »), the same
 * calendar projection through the answer trigger, and the same rules
 * around finality — a client can create an answer but never a joker
 * (`firestore.rules`' `hasAnswerShape()` refuses `is_joker: true`).
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
  /**
   * `QuestionOptionFirebaseData.id` of the picked option — never its position
   * in the array. Empty string for a joker (`is_joker: true`), since no
   * option was picked; the answer trigger branches on `is_joker` before
   * reading this, so the empty value is never indexed into.
   */
  option_id: string;
  /**
   * True for a joker (docs/prd.md §4.8): the day was passed rather than
   * answered. The answer trigger skips the `answer_counts` increment for a
   * joker (nothing to count) and projects the day into `jokers.{DD}` on the
   * user's calendar month instead of `days.{DD}`, but still advances the
   * streak and fans the friend badge out — a joker is « done » for every
   * consumer except the tally itself.
   *
   * Written only by the `questions-useJoker` callable, admin-side.
   * `firestore.rules`' `hasAnswerShape()` refuses a client create that sets
   * this to `true`, so a client can never forge a joker.
   */
  is_joker: boolean;
  answered_at: UniversalTimestamp;
  /**
   * True for a catch-up answer, given after the day closed (docs/prd.md §4.2).
   * It completes the calendar and unlocks the card, but never restores the
   * streak — which is why the flag is stored rather than recomputed from
   * `answered_at` at display time.
   */
  late: boolean;
  /**
   * When the answer trigger folded this answer into the question's
   * `answer_counts` — written in that very transaction, so it cannot exist
   * without the count it announces. Written by the backend alone, and `null` on
   * every answer the client creates: `firestore.rules` refuses a create that
   * pre-fills it, and refuses every update, so the trigger's stamp is the one
   * write an answer ever receives after its own.
   *
   * Two things read it.
   *
   * The **onboarding demo** (docs/prd.md §5.6) needs it to be idempotent: a
   * trigger is delivered at least once, so an increment needs a marker to bail
   * out on, and a broadcast answer has one for free — its entry in the author's
   * calendar month, which the same transaction writes and reads back. A demo
   * answer is projected nowhere, being no day, so it has none.
   *
   * The **day screen** needs it to know whether the tally it holds already
   * carries the answer just written (`useDailyQuestion`). It reads the question
   * first and the answer second: a marker still absent on the second read
   * proves the tally of the first was taken without this answer, and the screen
   * folds it in itself rather than showing a percentage one answer short. The
   * ordering is what makes that sound — it can only ever fail by not folding
   * in, never by counting the same answer twice.
   */
  counted_at: UniversalTimestamp | null;
}

export type DailyQuestionAnswerData = ModelData<DailyQuestionAnswerFirebaseData>;

export const dailyQuestionAnswerConverter: FirestoreConverter<DailyQuestionAnswerData, DailyQuestionAnswerFirebaseData> = (TimestampClass) => ({
  toFirestore: (data) => removeMissingFields({
    user_id: data.user_id,
    question_id: data.question_id,
    date: data.date,
    option_id: data.option_id,
    is_joker: data.is_joker,
    answered_at: TimestampClass.fromDate(new Date(data.answered_at)),
    late: data.late,
    counted_at: data.counted_at ? TimestampClass.fromDate(new Date(data.counted_at)) : null,
  }),
  fromFirestore: (snap) => {
    const data = snap.data();

    return {
      user_id: data.user_id ?? '',
      question_id: data.question_id ?? '',
      date: data.date ?? '',
      option_id: data.option_id ?? '',
      // Younger than the collection — an answer written before jokers shipped
      // reads as `false`, which is what an answer that predates the flag is.
      is_joker: data.is_joker ?? false,
      answered_at: parseTimestamp(data.answered_at ?? null, 'now'),
      late: data.late ?? false,
      counted_at: parseTimestamp(data.counted_at ?? null),
    };
  },
});
