import { z } from 'zod';

import { QUESTION_MAX_OPTIONS, QUESTION_MIN_OPTIONS } from '@statowrel/models';

const QUESTION_MAX_LENGTH = 120;
const OPTION_MAX_LENGTH = 60;
/** « tu es un.e … » — a StatOwrel is one word, two at most. */
const STAT_LABEL_MAX_LENGTH = 30;

const optionSchema = z.object({
  /**
   * Empty on an option being typed in for the first time — `saveQuestion` mints
   * the ULID then. An option being edited carries the one it already has, and
   * it never changes: a recorded answer and `answer_counts` both point at it.
   */
  id: z.string(),
  label: z
    .string()
    .trim()
    .min(1, 'Renseigne la réponse.')
    .max(OPTION_MAX_LENGTH, `${OPTION_MAX_LENGTH} caractères maximum.`),
  stat_label: z
    .string()
    .trim()
    .min(1, 'Renseigne la StatOwrel.')
    .max(STAT_LABEL_MAX_LENGTH, `${STAT_LABEL_MAX_LENGTH} caractères maximum.`),
});

/**
 * Mirrors what `firestore.rules` accepts on a `v1_questions` create — 2 to 6
 * options — so the form refuses what the database would refuse anyway, with a
 * message instead of a `permission-denied`.
 */
export const questionSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, 'Renseigne ta question.')
    .max(QUESTION_MAX_LENGTH, `${QUESTION_MAX_LENGTH} caractères maximum.`),
  options: z
    .array(optionSchema)
    .min(QUESTION_MIN_OPTIONS, `Il faut au moins ${QUESTION_MIN_OPTIONS} options.`)
    .max(QUESTION_MAX_OPTIONS, `Il faut au plus ${QUESTION_MAX_OPTIONS} options.`),
});

export type QuestionValues = z.infer<typeof questionSchema>;
