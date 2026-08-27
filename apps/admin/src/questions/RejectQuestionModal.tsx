import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

import { Alert } from '@/components/Alert';
import { Button } from '@/components/Button';
import { TextAreaField } from '@/components/TextAreaField';

import { setQuestionStatus } from './data/saveQuestion';
import type { ModeratedQuestion } from './data/useQuestions';
import { type RejectionValues, rejectionSchema } from './schemas';

export interface RejectQuestionModalProps {
  question: ModeratedQuestion;
  onClose: () => void;
}

/**
 * The refusal, and the reason that goes back to its author (docs/prd.md §4.7) —
 * a field rather than a bare button, since `rejection_reason` is what a
 * `rejected` question has to carry.
 *
 * Same native `<dialog>` as `QuestionModal`: focus trap, backdrop and Escape
 * from the browser. Re-rejecting an already refused question is how its reason
 * gets rewritten, so the field opens on the one it already has.
 */
export const RejectQuestionModal = ({ question, onClose }: RejectQuestionModalProps) => {
  const dialog = useRef<HTMLDialogElement>(null);
  const [ error, setError ] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RejectionValues>({
    resolver: zodResolver(rejectionSchema),
    defaultValues: { rejection_reason: question.rejection_reason ?? '' },
  });

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  const onSubmit = handleSubmit(async (values) => {
    setError(null);

    try {
      await setQuestionStatus(question.id, 'rejected', values.rejection_reason);
      onClose();
    } catch (cause) {
      console.warn('[questions] could not reject the question', cause);
      setError('Le refus n\'a pas pu être enregistré. Réessaie.');
    }
  });

  return (
    <dialog
      ref={dialog}
      className="modal modal--narrow"
      onCancel={onClose}
      onClose={onClose}
      aria-labelledby="reject-modal-title"
    >
      <div className="modal__inner stack">
        <div className="row row--between">
          <h2 id="reject-modal-title">Refuser la question</h2>
          <Button variant="ghost" small onClick={onClose} aria-label="Fermer">
            Fermer
          </Button>
        </div>

        <p className="tagline">« {question.label} »</p>

        {question.status === 'approved' ? (
          <Alert tone="warning">
            Cette question est validée : la refuser la sort du pot et elle ne pourra plus être
            tirée.
          </Alert>
        ) : null}

        {error ? <Alert tone="error">{error}</Alert> : null}

        <form className="stack" onSubmit={onSubmit} noValidate>
          <TextAreaField
            label="Motif du refus"
            hint="Renvoyé à l'auteur. Ex. « Trop proche d'une question déjà posée. »"
            rows={4}
            error={errors.rejection_reason?.message}
            {...register('rejection_reason')}
          />

          <Button type="submit" block disabled={isSubmitting}>
            {isSubmitting ? 'Enregistrement…' : 'Refuser la question'}
          </Button>
        </form>
      </div>
    </dialog>
  );
};
