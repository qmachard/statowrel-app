import { useState } from 'react';

import type { QuestionStatus } from '@statowrel/models';

import { Alert } from '@/components/Alert';
import { Button } from '@/components/Button';

import { setQuestionStatus } from './data/saveQuestion';
import { type ModeratedQuestion, useQuestions } from './data/useQuestions';

const STATUS_LABELS: Record<QuestionStatus, string> = {
  pending: 'En attente',
  approved: 'Validée',
  rejected: 'Rejetée',
  used: 'Diffusée',
};

/** A question already in the pot, or already out of it, has nothing left to approve. */
const isApprovable = (status: QuestionStatus): boolean => status !== 'approved' && status !== 'used';

const formatDay = (value: string): string => (
  new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })
);

interface RowProps {
  question: ModeratedQuestion;
  onEdit: (question: ModeratedQuestion) => void;
  onError: (message: string) => void;
}

const Row = ({ question, onEdit, onError }: RowProps) => {
  const [ approving, setApproving ] = useState(false);

  const approve = async () => {
    setApproving(true);

    try {
      // Approving clears any rejection reason: the two never hold together, and
      // a re-approved question must not keep telling its author it was refused.
      await setQuestionStatus(question.id, 'approved');
    } catch (cause) {
      console.warn('[questions] could not approve the question', cause);
      onError('L\'approbation n\'a pas pu être enregistrée. Réessaie.');
    } finally {
      setApproving(false);
    }
  };

  return (
    <tr>
      <td>
        <strong>{question.label}</strong>
        <ul className="proposal__options">
          {question.options.map((option) => (
            <li key={option.id}>
              {option.label} — <em>tu es un.e {option.stat_label}</em>
            </li>
          ))}
        </ul>
        {question.rejection_reason ? (
          <p className="field__error">{question.rejection_reason}</p>
        ) : null}
      </td>
      <td>
        <span className={`badge badge--${question.status}`}>{STATUS_LABELS[question.status]}</span>
        {question.broadcast_on ? (
          <p className="empty">Tirée le {formatDay(question.broadcast_on)}</p>
        ) : null}
      </td>
      <td className="table__actions">
        <div className="table__actions-inner">
          <Button variant="secondary" small onClick={() => onEdit(question)}>
            Éditer
          </Button>
          {isApprovable(question.status) ? (
            <Button small onClick={() => { void approve(); }} disabled={approving}>
              {approving ? '…' : 'Approuver'}
            </Button>
          ) : null}
        </div>
      </td>
    </tr>
  );
};

export interface QuestionsTableProps {
  onEdit: (question: ModeratedQuestion) => void;
}

/** The whole moderation pot, one row per question, newest first. */
export const QuestionsTable = ({ onEdit }: QuestionsTableProps) => {
  const { questions, loading, error } = useQuestions();
  const [ actionError, setActionError ] = useState<string | null>(null);

  if (error || actionError) {
    return <Alert tone="error">{error ?? actionError ?? ''}</Alert>;
  }

  if (loading) {
    return <p className="empty">Chargement…</p>;
  }

  if (questions.length === 0) {
    return <p className="empty">Le pot est vide. La première question est à un bouton d'ici.</p>;
  }

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th scope="col">Question</th>
            <th scope="col">Statut</th>
            <th scope="col" className="table__actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          {questions.map((question) => (
            <Row
              key={question.id}
              question={question}
              onEdit={onEdit}
              onError={setActionError}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};
