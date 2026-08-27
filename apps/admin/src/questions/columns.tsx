import {
  columnFilteringFeature,
  createColumnHelper,
  createFilteredRowModel,
  createSortedRowModel,
  filterFn_equalsString,
  rowSortingFeature,
  sortFn_datetime,
  tableFeatures,
} from '@tanstack/react-table';

import { type QuestionStatus, questionLastModifiedAt } from '@statowrel/models';

import { Button } from '@/components/Button';
import { DataTableColumnHeader } from '@/components/DataTable';

import type { ModeratedQuestion } from './data/useQuestions';

export const STATUS_LABELS: Record<QuestionStatus, string> = {
  pending: 'En attente',
  approved: 'Validée',
  rejected: 'Rejetée',
  used: 'Diffusée',
  demo: 'Démo',
};

/**
 * Only what the table actually uses: in v9 a feature that is not registered has
 * no state and no API at all, and registering the rest would bundle row models
 * nothing here renders.
 */
export const questionsTableFeatures = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { datetime: sortFn_datetime },
  columnFilteringFeature,
  filteredRowModel: createFilteredRowModel(),
  filterFns: { equalsString: filterFn_equalsString },
});

export type QuestionsTableFeatures = typeof questionsTableFeatures;

/**
 * A question already in the pot, or already out of it, has nothing left to
 * approve — and neither has the onboarding sample: approving it would drop it
 * into the daily draw, where it would run as a real day nobody wrote it for.
 */
export const isApprovable = (status: QuestionStatus): boolean => (
  status !== 'approved' && status !== 'used' && status !== 'demo'
);

/**
 * Withdrawing is for a question that never reached anybody. Once it has dropped
 * as a day, `v1_daily_question_months` points at it, its sub-collection holds
 * everyone's answers and the calendar opens on it — so the broadcast stamp, and
 * not the `used` status, is what closes the door: the two coincide today, but
 * the stamp is the fact this is about (same reasoning as `firestore.rules`).
 */
export const isRemovable = (question: ModeratedQuestion): boolean => (
  question.broadcast_at === null && question.status !== 'demo'
);

const formatDay = (value: string): string => (
  new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })
);

const formatDayTime = (value: string): string => (
  new Date(value).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
);

export interface QuestionRowActions {
  onEdit: (question: ModeratedQuestion) => void;
  onApprove: (question: ModeratedQuestion) => void;
  onRemove: (question: ModeratedQuestion) => void;
  /** Id of the question a write is in flight for, so its row's buttons wait it out. */
  pendingId: string | null;
}

const helper = createColumnHelper<QuestionsTableFeatures, ModeratedQuestion>();

export const buildQuestionColumns = (actions: QuestionRowActions) => helper.columns([
  helper.accessor('label', {
    id: 'label',
    header: 'Question + Réponses',
    enableSorting: false,
    enableColumnFilter: false,
    cell: ({ row }) => (
      <>
        <strong>{row.original.label}</strong>
        <ul className="proposal__options">
          {row.original.options.map((option) => (
            <li key={option.id}>
              {option.label} — <em>tu es un.e {option.stat_label}</em>
            </li>
          ))}
        </ul>
        {row.original.rejection_reason ? (
          <p className="field__error">{row.original.rejection_reason}</p>
        ) : null}
      </>
    ),
  }),

  helper.accessor('status', {
    id: 'status',
    header: 'Statut',
    enableSorting: false,
    meta: { cellClassName: 'table__status' },
    // An exact match on the accessor value, not on what the cell renders: the
    // toolbar's `<select>` holds `QuestionStatus` values, and the labels are a
    // display concern.
    filterFn: 'equalsString',
    cell: ({ row }) => (
      <>
        <span className={`badge badge--${row.original.status}`}>
          {STATUS_LABELS[row.original.status]}
        </span>
        {row.original.broadcast_on ? (
          <p className="empty">Tirée le {formatDay(row.original.broadcast_on)}</p>
        ) : null}
      </>
    ),
  }),

  helper.accessor((question) => questionLastModifiedAt(question), {
    id: 'updated_at',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Dernière modification le" />
    ),
    // ISO strings, so `datetime` compares the instants rather than the
    // characters — they agree at the same zero-padded offset, but a value
    // written with another one would sort wrong.
    sortFn: 'datetime',
    enableColumnFilter: false,
    cell: ({ getValue }) => (
      <span className="table__date">{formatDayTime(getValue())}</span>
    ),
  }),

  helper.display({
    id: 'actions',
    header: 'Actions',
    meta: { headerClassName: 'table__actions', cellClassName: 'table__actions' },
    cell: ({ row }) => {
      const question = row.original;
      const busy = actions.pendingId === question.id;

      return (
        <div className="table__actions-inner">
          {isApprovable(question.status) ? (
            <Button small disabled={busy} onClick={() => actions.onApprove(question)}>
              {busy ? '…' : 'Approuver'}
            </Button>
          ) : null}
          <Button variant="secondary" small onClick={() => actions.onEdit(question)}>
            Éditer
          </Button>
          {isRemovable(question) ? (
            <Button
              variant="ghost"
              small
              disabled={busy}
              className="button--danger"
              onClick={() => actions.onRemove(question)}
            >
              Retirer
            </Button>
          ) : null}
        </div>
      );
    },
  }),
]);
