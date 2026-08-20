import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';

import { QUESTION_MAX_OPTIONS, QUESTION_MIN_OPTIONS } from '@statowrel/models';

import { Alert } from '@/components/Alert';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';

import { createQuestion, updateQuestion } from './data/saveQuestion';
import type { ModeratedQuestion } from './data/useQuestions';
import { type QuestionValues, questionSchema } from './schemas';

const emptyOption = () => ({ id: '', label: '', stat_label: '' });

const valuesOf = (question: ModeratedQuestion | null): QuestionValues => (
  question
    ? {
      label: question.label,
      options: question.options.map((option) => ({
        // Carried through the form so the id survives an edit: an answer points
        // at it, so it is never regenerated.
        id: option.id,
        label: option.label,
        stat_label: option.stat_label,
      })),
    }
    : { label: '', options: Array.from({ length: QUESTION_MIN_OPTIONS }, emptyOption) }
);

export interface QuestionModalProps {
  /** The question being edited, or null to write a new one. */
  question: ModeratedQuestion | null;
  authorId: string;
  onClose: () => void;
}

/**
 * One modal for both jobs — writing a question and editing one. A native
 * `<dialog>`, so the focus trap, the backdrop and Escape come from the browser
 * rather than from a library.
 *
 * Mounted only while open and keyed by the question it edits, so the form is
 * built from the right defaults instead of being reset after the fact.
 */
export const QuestionModal = ({ question, authorId, onClose }: QuestionModalProps) => {
  const dialog = useRef<HTMLDialogElement>(null);
  const [ error, setError ] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<QuestionValues>({
    resolver: zodResolver(questionSchema),
    defaultValues: valuesOf(question),
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'options' });

  // `showModal()` is what makes the dialog modal — rendering it `open` would
  // leave the page behind it focusable.
  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  const onSubmit = handleSubmit(async (values) => {
    setError(null);

    try {
      if (question) {
        await updateQuestion(question.id, values);
      } else {
        await createQuestion(authorId, values);
      }

      onClose();
    } catch (cause) {
      console.warn('[questions] could not save the question', cause);
      setError('La question n\'a pas pu être enregistrée. Réessaie.');
    }
  });

  const isBroadcast = question?.broadcast_at !== null && question?.broadcast_at !== undefined;

  return (
    <dialog
      ref={dialog}
      className="modal"
      onCancel={onClose}
      onClose={onClose}
      aria-labelledby="question-modal-title"
    >
      <div className="modal__inner stack">
        <div className="row row--between">
          <h2 id="question-modal-title">
            {question ? 'Éditer la question' : 'Nouvelle question'}
          </h2>
          <Button variant="ghost" small onClick={onClose} aria-label="Fermer">
            Fermer
          </Button>
        </div>

        <p className="tagline">
          Intime, absurde, jamais moralisatrice. De {QUESTION_MIN_OPTIONS} à {QUESTION_MAX_OPTIONS}{' '}
          options, chacune avec sa StatOwrel : « Comme 68% des utilisateurs, tu es un.e efficace. »
        </p>

        {isBroadcast ? (
          <Alert tone="warning">
            Cette question a déjà été diffusée : des réponses pointent sur ses options. Reformuler
            une option est sans risque, en retirer une orpheline les réponses qui l'ont choisie.
          </Alert>
        ) : null}

        {error ? <Alert tone="error">{error}</Alert> : null}

        <form className="stack" onSubmit={onSubmit} noValidate>
          <TextField
            label="La question"
            hint="Ex. « Ton dentifrice, tu le presses… »"
            error={errors.label?.message}
            {...register('label')}
          />

          {fields.map((field, index) => (
            <div className="option" key={field.id}>
              <div className="option__head">
                <span className="option__index">Option {index + 1}</span>
                {fields.length > QUESTION_MIN_OPTIONS ? (
                  <Button variant="ghost" small onClick={() => remove(index)}>
                    Retirer
                  </Button>
                ) : null}
              </div>
              <input type="hidden" {...register(`options.${index}.id`)} />
              <TextField
                label="Réponse affichée"
                hint="Ex. « Par le bout »"
                error={errors.options?.[index]?.label?.message}
                {...register(`options.${index}.label`)}
              />
              <TextField
                label="StatOwrel"
                hint="Affichée comme « tu es un.e … ». Ex. « méthodique »"
                error={errors.options?.[index]?.stat_label?.message}
                {...register(`options.${index}.stat_label`)}
              />
            </div>
          ))}

          {/* The array-level message — too few or too many options — has nowhere else to land. */}
          {errors.options?.root?.message ?? errors.options?.message ? (
            <span className="field__error">
              {errors.options?.root?.message ?? errors.options?.message}
            </span>
          ) : null}

          <div className="row">
            <Button
              variant="secondary"
              small
              onClick={() => append(emptyOption())}
              disabled={fields.length >= QUESTION_MAX_OPTIONS}
            >
              Ajouter une option
            </Button>
            <span className="tagline">
              {fields.length} / {QUESTION_MAX_OPTIONS}
            </span>
          </div>

          <Button type="submit" block disabled={isSubmitting}>
            {isSubmitting ? 'Enregistrement…' : question ? 'Enregistrer' : 'Envoyer en modération'}
          </Button>
        </form>
      </div>
    </dialog>
  );
};
