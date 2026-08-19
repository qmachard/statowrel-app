import {
  type FirestoreConverter,
  type ModelData,
  type UniversalTimestamp,
  parseTimestamp,
  removeMissingFields,
} from './commons';

export const QUESTION_COLLECTION = 'v1_questions';

/** A question carries between 2 and 6 options — see docs/prd.md §4.2. */
export const QUESTION_MIN_OPTIONS = 2;
export const QUESTION_MAX_OPTIONS = 6;

/**
 * Moderation lifecycle (docs/prd.md §4.7): a user proposes a question
 * (`pending`), a moderator approves or rejects it, and it becomes `used` once
 * it has been drawn as a daily question. A used question is never redrawn.
 */
export const QUESTION_STATUSES = [ 'pending', 'approved', 'rejected', 'used' ] as const;

export type QuestionStatus = (typeof QUESTION_STATUSES)[number];

export interface QuestionOptionFirebaseData {
  /**
   * ULID, minted client-side (app or backoffice) when the option is typed in.
   * An answer and `v1_daily_questions.answer_counts` both point at it, so it is
   * never reused and never changes — reordering or reformulating an option must
   * not repoint recorded answers.
   */
  id: string;
  /** Option shown to the user — e.g. "Par le bout". */
  label: string;
  /** StatOwrel earned by picking this option — e.g. "méthodique", rendered as "tu es un.e méthodique". */
  stat_label: string;
}

export interface QuestionFirebaseData {
  /** Question text — e.g. "Ton dentifrice, tu le presses…". */
  label: string;
  /**
   * Options in display order — the array order is the order every user sees,
   * which is what makes screenshots comparable between friends.
   * Between QUESTION_MIN_OPTIONS and QUESTION_MAX_OPTIONS entries.
   */
  options: QuestionOptionFirebaseData[];
  status: QuestionStatus;
  /** Author of the question, credited on the question screen once it is drawn. */
  author_id: string;
  /** Reason sent back to the author. Null unless `status` is `rejected`. */
  rejection_reason: string | null;
  /**
   * Instant the question is broadcast as the daily question — the day it was
   * drawn, at the 07:00 Paris drop time. Null until the question is drawn.
   */
  broadcast_at: UniversalTimestamp | null;
  created_at: UniversalTimestamp;
}

export type QuestionOptionData = ModelData<QuestionOptionFirebaseData>;

export type QuestionData = ModelData<QuestionFirebaseData>;

/** Resolves the option an answer points at. Returns `null` for an option removed since. */
export const findQuestionOption = (
  options: QuestionOptionData[] | null | undefined,
  optionId: string,
): QuestionOptionData | null => (
  options?.find((option) => option.id === optionId) ?? null
);

const parseOptions = (
  options: Partial<QuestionOptionFirebaseData>[] | null | undefined,
): QuestionOptionData[] => (
  (options ?? []).map((option) => ({
    id: option?.id ?? '',
    label: option?.label ?? '',
    stat_label: option?.stat_label ?? '',
  }))
);

export const questionConverter: FirestoreConverter<QuestionData, QuestionFirebaseData> = (TimestampClass) => ({
  toFirestore: (data) => removeMissingFields({
    label: data.label,
    options: (data.options ?? []).map((option) => ({
      id: option.id,
      label: option.label,
      stat_label: option.stat_label,
    })),
    status: data.status,
    author_id: data.author_id,
    rejection_reason: data.rejection_reason ?? null,
    broadcast_at: data.broadcast_at ? TimestampClass.fromDate(new Date(data.broadcast_at)) : null,
    created_at: TimestampClass.fromDate(new Date(data.created_at)),
  }),
  fromFirestore: (snap) => {
    const data = snap.data();

    return {
      label: data.label ?? '',
      options: parseOptions(data.options),
      status: data.status ?? 'pending',
      author_id: data.author_id ?? '',
      rejection_reason: data.rejection_reason ?? null,
      broadcast_at: parseTimestamp(data.broadcast_at ?? null),
      created_at: parseTimestamp(data.created_at ?? null, 'now'),
    };
  },
});
