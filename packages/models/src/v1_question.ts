import {
  type FirestoreConverter,
  type ModelData,
  type UniversalTimestamp,
  parseTimestamp,
  removeMissingFields,
} from './commons';

export const QUESTION_COLLECTION = 'v1_question';

/**
 * One possible answer of a question. Stored inside the question's `answers`
 * map, keyed by its own generated id.
 */
export interface QuestionAnswerFirebaseData {
  /** Answer shown to the user — e.g. "Assis". */
  label: string;
  /** Title earned by a user picking this answer — e.g. "un.e Assis". */
  title: string;
}

export interface QuestionFirebaseData {
  /** Question text — e.g. "Aux toilettes, tu t'essuies...". */
  question: string;
  /** Possible answers, keyed by answer id. */
  answers: Record<string, QuestionAnswerFirebaseData>;
  /** Whether several answers can be picked at once. */
  is_multiple: boolean;
  /** Author of the question. */
  user_id: string;
  created_at: UniversalTimestamp;
  /** Null while the question has not been submitted yet. */
  submitted_at: UniversalTimestamp | null;
}

export type QuestionAnswerData = ModelData<QuestionAnswerFirebaseData>;

export type QuestionData = ModelData<QuestionFirebaseData>;

const parseAnswers = (
  answers: Record<string, Partial<QuestionAnswerFirebaseData>> | null | undefined,
): Record<string, QuestionAnswerData> => (
  Object.entries(answers ?? {}).reduce<Record<string, QuestionAnswerData>>((acc, [ id, answer ]) => {
    acc[id] = {
      label: answer?.label ?? '',
      title: answer?.title ?? '',
    };

    return acc;
  }, {})
);

export const questionConverter: FirestoreConverter<QuestionData, QuestionFirebaseData> = (TimestampClass) => ({
  toFirestore: (data) => removeMissingFields({
    question: data.question,
    answers: Object.entries(data.answers ?? {}).reduce<Record<string, QuestionAnswerFirebaseData>>((acc, [ id, answer ]) => {
      acc[id] = {
        label: answer.label,
        title: answer.title,
      };

      return acc;
    }, {}),
    is_multiple: data.is_multiple,
    user_id: data.user_id,
    created_at: TimestampClass.fromDate(new Date(data.created_at)),
    submitted_at: data.submitted_at ? TimestampClass.fromDate(new Date(data.submitted_at)) : null,
  }),
  fromFirestore: (snap) => {
    const data = snap.data();

    return {
      question: data.question ?? '',
      answers: parseAnswers(data.answers),
      is_multiple: data.is_multiple ?? false,
      user_id: data.user_id ?? '',
      created_at: parseTimestamp(data.created_at ?? null, 'now'),
      submitted_at: parseTimestamp(data.submitted_at ?? null),
    };
  },
});
