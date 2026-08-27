import {
  columnFilteringFeature,
  createColumnHelper,
  createFilteredRowModel,
  createSortedRowModel,
  filterFn_equalsString,
  rowSortingFeature,
  sortFn_datetime,
  sortFn_text,
  tableFeatures,
} from '@tanstack/react-table';

import { type QuestionStatus, questionLastModifiedAt } from '@statowrel/models';

import { Button } from '@/components/Button';
import { DataTableColumnHeader } from '@/components/DataTable';
import { DropdownMenu } from '@/components/DropdownMenu';
import { PencilIcon } from '@/components/icons';

import type { QuestionAuthors } from './data/useQuestionAuthors';
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
  sortFns: { datetime: sortFn_datetime, text: sortFn_text },
  columnFilteringFeature,
  filteredRowModel: createFilteredRowModel(),
  filterFns: { equalsString: filterFn_equalsString },
});

export type QuestionsTableFeatures = typeof questionsTableFeatures;

/**
 * The two verdicts of docs/prd.md §4.7, each offered only where it changes
 * something: a question in the pot can be approved unless it already is, and
 * refused unless it already is.
 *
 * `used` and `demo` take neither. A drawn question has left the pot for good —
 * approving it would put it back in the draw it was taken out of — and the
 * onboarding sample was never in it: approving *that* would run it as a real
 * day nobody wrote it for.
 */
const MODERATED_STATUSES: QuestionStatus[] = [ 'pending', 'approved', 'rejected' ];

export const isApprovable = (status: QuestionStatus): boolean => (
  MODERATED_STATUSES.includes(status) && status !== 'approved'
);

export const isRejectable = (status: QuestionStatus): boolean => (
  MODERATED_STATUSES.includes(status) && status !== 'rejected'
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
  onReject: (question: ModeratedQuestion) => void;
  /** Id of the question a write is in flight for, so its row's buttons wait it out. */
  pendingId: string | null;
  /** Handle per author UID, filled in as the profiles come back. */
  authors: QuestionAuthors;
}

const helper = createColumnHelper<QuestionsTableFeatures, ModeratedQuestion>();

export const buildQuestionColumns = (actions: QuestionRowActions) => helper.columns([
  helper.accessor('label', {
    id: 'label',
    header: 'Question + Réponses',
    enableSorting: false,
    enableColumnFilter: false,
    meta: { headerClassName: 'table__main', cellClassName: 'table__main' },
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

  // Reads through `actions.authors` rather than off the row: a question carries
  // its author's UID alone, and the handle arrives one profile read later.
  helper.accessor((question) => actions.authors[question.author_id] ?? '', {
    id: 'author',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Auteur" />,
    sortFn: 'text',
    enableColumnFilter: false,
    meta: { cellClassName: 'table__status' },
    cell: ({ row, getValue }) => {
      const username = getValue();

      if (username) {
        return <span className="table__author">@{username}</span>;
      }

      const authorId = row.original.author_id;

      // No UID at all is a seeded question — it has no author to name. A UID
      // the map has not answered for yet is a profile still in flight, which is
      // not the same thing as one that came back empty: an account deleted
      // since, whose questions keep counting in the pot.
      return (
        <span className="empty" title={authorId || undefined}>
          {authorId === '' ? '—' : authorId in actions.authors ? 'Compte introuvable' : '…'}
        </span>
      );
    },
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

      const edit = (
        <Button
          variant="secondary"
          small
          icon
          aria-label="Éditer la question"
          title="Éditer"
          onClick={() => actions.onEdit(question)}
        >
          <PencilIcon />
        </Button>
      );

      // A question waiting on a verdict wears both of them: that is the whole
      // job of the screen, and burying either one behind a « … » would make the
      // moderator open a menu on every row of the pot.
      if (question.status === 'pending') {
        return (
          <div className="table__actions-inner">
            <Button small disabled={busy} onClick={() => actions.onApprove(question)}>
              {busy ? '…' : 'Approuver'}
            </Button>
            <Button
              variant="ghost"
              small
              className="button--danger"
              onClick={() => actions.onReject(question)}
            >
              Rejeter
            </Button>
            {edit}
          </div>
        );
      }

      // Once a verdict is in, the other one is a reversal — reachable, but not
      // sitting on the row. `used` and `demo` have none to reverse: a drawn
      // question has left the pot for good, and the onboarding sample was never
      // in it.
      const reversal = isApprovable(question.status)
        ? { label: 'Approuver', run: () => actions.onApprove(question) }
        : isRejectable(question.status)
          ? { label: 'Rejeter', run: () => actions.onReject(question) }
          : null;

      return (
        <div className="table__actions-inner">
          {edit}
          {reversal ? (
            <DropdownMenu label="Autres actions">
              <button type="button" className="menu__item" disabled={busy} onClick={reversal.run}>
                {reversal.label}
              </button>
              <button type="button" className="menu__item" onClick={() => actions.onEdit(question)}>
                Éditer
              </button>
            </DropdownMenu>
          ) : null}
        </div>
      );
    },
  }),
]);
