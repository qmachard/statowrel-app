import { z } from 'zod';

import {
  QUESTION_LABEL_MAX_LENGTH,
  QUESTION_MAX_OPTIONS,
  QUESTION_MIN_OPTIONS,
  QUESTION_OPTION_LABEL_MAX_LENGTH,
  QUESTION_OPTION_STAT_LABEL_MAX_LENGTH,
} from '@statowrel/models';

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
    .max(QUESTION_OPTION_LABEL_MAX_LENGTH, `${QUESTION_OPTION_LABEL_MAX_LENGTH} caractères maximum.`),
  // Optional, like everywhere else (docs/prd.md §4.7): a moderator editing a
  // question posed without a StatOwrel must not be made to invent one to save
  // their edit.
  stat_label: z
    .string()
    .trim()
    .max(QUESTION_OPTION_STAT_LABEL_MAX_LENGTH, `${QUESTION_OPTION_STAT_LABEL_MAX_LENGTH} caractères maximum.`),
});

/**
 * The lengths and the 2-to-6 count both come from `@statowrel/models`, which is
 * where they now live: the app's own proposal form (docs/prd.md §4.7) and the
 * callable behind it refuse exactly the same thing, and three copies of a limit
 * is a limit that drifts. This console writes through the `isAdmin()` wildcard
 * rather than through the rules' own `v1_questions` block, so what it refuses
 * here is all that stands between a moderator and a malformed question.
 */
export const questionSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, 'Renseigne ta question.')
    .max(QUESTION_LABEL_MAX_LENGTH, `${QUESTION_LABEL_MAX_LENGTH} caractères maximum.`),
  options: z
    .array(optionSchema)
    .min(QUESTION_MIN_OPTIONS, `Il faut au moins ${QUESTION_MIN_OPTIONS} options.`)
    .max(QUESTION_MAX_OPTIONS, `Il faut au plus ${QUESTION_MAX_OPTIONS} options.`),
});

export type QuestionValues = z.infer<typeof questionSchema>;

const REJECTION_REASON_MAX_LENGTH = 280;

/**
 * A rejection carries its reason, which is what the author reads back — the one
 * field the model requires alongside the `rejected` status, so the form asks
 * for it rather than letting a blank one through.
 */
export const rejectionSchema = z.object({
  rejection_reason: z
    .string()
    .trim()
    .min(1, 'Explique le refus : l\'auteur le lira.')
    .max(REJECTION_REASON_MAX_LENGTH, `${REJECTION_REASON_MAX_LENGTH} caractères maximum.`),
});

export type RejectionValues = z.infer<typeof rejectionSchema>;
