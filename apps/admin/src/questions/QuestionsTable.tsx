import type { ColumnFiltersState, SortingState } from '@tanstack/react-table';
import { useTable } from '@tanstack/react-table';
import { useMemo, useState } from 'react';

import { QUESTION_STATUSES, type QuestionStatus } from '@statowrel/models';

import { Alert } from '@/components/Alert';
import { DataTable } from '@/components/DataTable';

import { STATUS_LABELS, buildQuestionColumns, questionsTableFeatures } from './columns';
import { deleteQuestion, setQuestionStatus } from './data/saveQuestion';
import { type ModeratedQuestion, useQuestions } from './data/useQuestions';

/** Newest change first — the order a moderator comes back to the pot in. */
const INITIAL_SORTING: SortingState = [ { id: 'updated_at', desc: true } ];

const ALL_STATUSES = '';

export interface QuestionsTableProps {
  onEdit: (question: ModeratedQuestion) => void;
}

/**
 * The whole moderation pot as a data table (docs/prd.md §4.7).
 *
 * Sorting and filtering are client-side: `useQuestions` already streams the pot
 * whole, so a `where` / `orderBy` pair would buy a composite index and a
 * reload per keystroke for a list that fits in one snapshot. It would also drop
 * every question written before `updated_at` existed — Firestore skips
 * documents missing the field an `orderBy` names — whereas
 * `questionLastModifiedAt` falls those back onto `created_at`.
 */
export const QuestionsTable = ({ onEdit }: QuestionsTableProps) => {
  const { questions, loading, error } = useQuestions();
  const [ actionError, setActionError ] = useState<string | null>(null);
  const [ pendingId, setPendingId ] = useState<string | null>(null);
  const [ sorting, setSorting ] = useState<SortingState>(INITIAL_SORTING);
  const [ columnFilters, setColumnFilters ] = useState<ColumnFiltersState>([]);

  const approve = async (question: ModeratedQuestion) => {
    setPendingId(question.id);

    try {
      // Approving clears any rejection reason: the two never hold together, and
      // a re-approved question must not keep telling its author it was refused.
      await setQuestionStatus(question.id, 'approved');
    } catch (cause) {
      console.warn('[questions] could not approve the question', cause);
      setActionError('L\'approbation n\'a pas pu être enregistrée. Réessaie.');
    } finally {
      setPendingId(null);
    }
  };

  const remove = async (question: ModeratedQuestion) => {
    if (!window.confirm(`Retirer « ${question.label} » ? Cette question sera supprimée définitivement.`)) {
      return;
    }

    setPendingId(question.id);

    try {
      await deleteQuestion(question.id);
    } catch (cause) {
      console.warn('[questions] could not remove the question', cause);
      setActionError('La question n\'a pas pu être retirée. Réessaie.');
    } finally {
      setPendingId(null);
    }
  };

  const columns = useMemo(() => buildQuestionColumns({
    onEdit,
    onApprove: (question) => { void approve(question); },
    onRemove: (question) => { void remove(question); },
    pendingId,
  // `approve` and `remove` are redefined on every render but close over
  // nothing that moves — the state setters alone — so what the cells need to
  // see change is the id a write is in flight for, and rebuilding the columns
  // on every render would throw the memo away.
  }), [ onEdit, pendingId ]);

  const table = useTable({
    features: questionsTableFeatures,
    columns,
    data: questions,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    // One column at a time: the header cycles asc / desc and never clears, so
    // the table always has an order to show.
    enableSortingRemoval: false,
    enableMultiSort: false,
  });

  const statusFilter = (columnFilters.find((filter) => filter.id === 'status')?.value ?? ALL_STATUSES) as string;

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
    <div className="stack">
      <div className="table-toolbar">
        <label className="table-toolbar__filter">
          <span className="field__label">Statut</span>
          <select
            className="field__input field__input--select"
            value={statusFilter}
            onChange={(event) => {
              const value = event.target.value;

              table.getColumn('status')?.setFilterValue(value === ALL_STATUSES ? undefined : value);
            }}
          >
            <option value={ALL_STATUSES}>Tous</option>
            {QUESTION_STATUSES.map((status: QuestionStatus) => (
              <option key={status} value={status}>{STATUS_LABELS[status]}</option>
            ))}
          </select>
        </label>
        <span className="spacer" />
        <p className="empty">
          {table.getRowModel().rows.length} / {questions.length} question(s)
        </p>
      </div>

      <DataTable
        table={table}
        empty={<p className="empty">Aucune question dans ce statut.</p>}
      />
    </div>
  );
};
