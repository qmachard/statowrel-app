import {
  QUESTION_LABEL_MAX_LENGTH,
  QUESTION_MAX_OPTIONS,
  QUESTION_MIN_OPTIONS,
  QUESTION_OPTION_LABEL_MAX_LENGTH,
  QUESTION_OPTION_STAT_LABEL_MAX_LENGTH,
} from '@statowrel/models';
import { z } from 'zod';

/**
 * The question somebody proposes, and what the form refuses before the callable
 * has to (docs/prd.md §4.7).
 *
 * Same bounds as the moderation console's own form and as
 * `questions-proposeQuestion`, all three off `@statowrel/models`: the callable
 * is the check, these two are what spare a round trip and say why in French.
 *
 * **The StatOwrel is optional.** Plenty of questions read better without one —
 * an option that is already an adjective is its own StatOwrel — so the field is
 * left empty rather than invented, and `statLabelOf` falls back to the option's
 * own label wherever the result of docs/prd.md §5.5 is said. Only the answer
 * itself is required: an option nobody can read is not an option.
 */
const optionSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, 'Renseigne cette réponse.')
    .max(QUESTION_OPTION_LABEL_MAX_LENGTH, `${QUESTION_OPTION_LABEL_MAX_LENGTH} caractères maximum.`),
  stat_label: z
    .string()
    .trim()
    .max(QUESTION_OPTION_STAT_LABEL_MAX_LENGTH, `${QUESTION_OPTION_STAT_LABEL_MAX_LENGTH} caractères maximum.`),
});

export const proposeQuestionSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, 'Écris ta question.')
    .max(QUESTION_LABEL_MAX_LENGTH, `${QUESTION_LABEL_MAX_LENGTH} caractères maximum.`),
  options: z
    .array(optionSchema)
    .min(QUESTION_MIN_OPTIONS, `Il faut au moins ${QUESTION_MIN_OPTIONS} réponses.`)
    .max(QUESTION_MAX_OPTIONS, `Il faut au plus ${QUESTION_MAX_OPTIONS} réponses.`),
});

export type ProposeQuestionValues = z.infer<typeof proposeQuestionSchema>;

/** What a freshly added option looks like — `useFieldArray`'s `append` takes it. */
export const emptyOption = (): ProposeQuestionValues['options'][number] => ({ label: '', stat_label: '' });
