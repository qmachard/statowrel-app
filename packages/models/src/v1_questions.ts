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

/**
 * One option of a question, stored in the question's `options` map under its
 * own ULID. The ULID is generated client-side (app or backoffice) when the
 * option is typed in, and is never reused.
 */
export interface QuestionOptionFirebaseData {
  /** Option shown to the user — e.g. "Par le bout". */
  label: string;
  /** StatOwrel earned by picking this option — e.g. "méthodique", rendered as "tu es un.e méthodique". */
  stat_label: string;
  /** Display order. Dense, 0-based — map key order is not guaranteed. */
  position: number;
}

export interface QuestionFirebaseData {
  /** Question text — e.g. "Ton dentifrice, tu le presses…". */
  label: string;
  /** Options, keyed by ULID. Between QUESTION_MIN_OPTIONS and QUESTION_MAX_OPTIONS entries. */
  options: Record<string, QuestionOptionFirebaseData>;
  status: QuestionStatus;
  /** Author of the question, credited on the question screen once it is drawn. */
  author_id: string;
  /** Reason sent back to the author. Null unless `status` is `rejected`. */
  rejection_reason: string | null;
  created_at: UniversalTimestamp;
}

export type QuestionOptionData = ModelData<QuestionOptionFirebaseData>;

export type QuestionData = ModelData<QuestionFirebaseData>;

/** A question's option with its ULID merged in, as returned by `sortQuestionOptions`. */
export type QuestionOptionEntry = QuestionOptionData & { id: string };

/**
 * Options in display order. Always go through this rather than iterating the
 * map: key order is not guaranteed, `position` is the source of truth.
 */
export const sortQuestionOptions = (
  options: Record<string, QuestionOptionData> | null | undefined,
): QuestionOptionEntry[] => (
  Object.entries(options ?? {})
    .map(([ id, option ]) => ({ ...option, id }))
    .sort((a, b) => a.position - b.position)
);

const parseOptions = (
  options: Record<string, Partial<QuestionOptionFirebaseData>> | null | undefined,
): Record<string, QuestionOptionData> => (
  Object.entries(options ?? {}).reduce<Record<string, QuestionOptionData>>((acc, [ id, option ], index) => {
    acc[id] = {
      label: option?.label ?? '',
      stat_label: option?.stat_label ?? '',
      position: option?.position ?? index,
    };

    return acc;
  }, {})
);

export const questionConverter: FirestoreConverter<QuestionData, QuestionFirebaseData> = (TimestampClass) => ({
  toFirestore: (data) => removeMissingFields({
    label: data.label,
    options: Object.entries(data.options ?? {}).reduce<Record<string, QuestionOptionFirebaseData>>((acc, [ id, option ]) => {
      acc[id] = {
        label: option.label,
        stat_label: option.stat_label,
        position: option.position,
      };

      return acc;
    }, {}),
    status: data.status,
    author_id: data.author_id,
    rejection_reason: data.rejection_reason ?? null,
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
      created_at: parseTimestamp(data.created_at ?? null, 'now'),
    };
  },
});
