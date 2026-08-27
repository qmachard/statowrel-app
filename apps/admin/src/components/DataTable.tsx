import type {
  CellData,
  Column,
  ReactTable,
  RowData,
  SortDirection,
  TableFeatures,
} from '@tanstack/react-table';
import type { ReactNode } from 'react';

/**
 * Per-column layout hooks the renderer below reads off the column definition —
 * the escape hatch TanStack leaves open so a generic table stays unaware of
 * what it renders.
 */
export interface DataTableColumnMeta {
  /** Class set on the `<th>` — `table__actions` shrink-wraps that column. */
  headerClassName?: string;
  /** Class set on every `<td>` of the column. */
  cellClassName?: string;
}

// The type parameters repeat the library's declaration to the letter, variance
// annotations included — declaration merging refuses anything else, which is
// also why none of them is used here.
/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-object-type */
declare module '@tanstack/react-table' {
  interface ColumnMeta<
    in out TFeatures extends TableFeatures,
    in out TData extends RowData,
    TValue extends CellData = CellData,
  > extends DataTableColumnMeta {}
}
/* eslint-enable @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-object-type */

/**
 * `columnDef` is a union of the accessor, display and group shapes, so reading
 * `meta` off it widens to their union rather than to the augmented interface.
 */
const metaOf = <TFeatures extends TableFeatures, TData extends RowData>(
  column: Column<TFeatures, TData, unknown>,
): DataTableColumnMeta => column.columnDef.meta as DataTableColumnMeta ?? {};

/**
 * The rendering half of a shadcn-shaped data table: TanStack Table owns the
 * models, this owns the markup.
 *
 * shadcn's own `<DataTable>` builds the table instance itself, from `columns`
 * and `data`. Here it takes the instance already built — a v9 table is typed on
 * its registered `features`, so building it inside would mean either pinning
 * this component to one feature set or erasing the type the column definitions
 * depend on. The caller keeps both, and gets the toolbar as a sibling rather
 * than a prop.
 *
 * No Tailwind and no Radix: the skin is `src/index.css`, whose tokens are the
 * mobile app's (see this app's CLAUDE.md).
 */
export interface DataTableProps<TFeatures extends TableFeatures, TData extends RowData> {
  table: ReactTable<TFeatures, TData>;
  /** Shown in place of the rows when the filters leave nothing to show. */
  empty: ReactNode;
}

export const DataTable = <TFeatures extends TableFeatures, TData extends RowData>({
  table,
  empty,
}: DataTableProps<TFeatures, TData>) => {
  const rows = table.getRowModel().rows;

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id}>
              {group.headers.map((header) => (
                <th
                  key={header.id}
                  scope="col"
                  colSpan={header.colSpan}
                  className={metaOf(header.column).headerClassName}
                >
                  {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={table.getAllLeafColumns().length}>{empty}</td>
            </tr>
          ) : rows.map((row) => (
            <tr key={row.id}>
              {row.getAllCells().map((cell) => (
                <td key={cell.id} className={metaOf(cell.column).cellClassName}>
                  <table.FlexRender cell={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/**
 * The three sorting APIs, taken structurally rather than as a typed `Column`.
 *
 * A v9 column's shape is conditional on the table's registered features, and a
 * component generic over `TableFeatures` sees that conditional unresolved — the
 * union of "sorting registered" and "not". Naming the methods instead keeps the
 * component free of the feature set, and the call site satisfies it with its
 * own concrete column.
 */
export interface SortableColumn {
  getCanSort: () => boolean;
  getIsSorted: () => false | SortDirection;
  getToggleSortingHandler: () => undefined | ((event: unknown) => void);
}

export interface DataTableColumnHeaderProps {
  column: SortableColumn;
  title: string;
}

const SORT_GLYPH: Record<SortDirection, string> = { asc: '↑', desc: '↓' };

/**
 * A sortable column header — shadcn puts a dropdown here, this stays a button
 * cycling the sort, which is the whole affordance when a column has nothing to
 * hide or pin.
 *
 * `aria-sort` on the `<th>` would be the accessible form, but the `<th>` is the
 * `DataTable`'s; the button carries the direction in its label instead, so a
 * screen reader hears the one it is about to switch to.
 */
export const DataTableColumnHeader = ({ column, title }: DataTableColumnHeaderProps) => {
  if (!column.getCanSort()) {
    return <>{title}</>;
  }

  const sorted = column.getIsSorted();

  return (
    <button
      type="button"
      className="table__sort"
      onClick={column.getToggleSortingHandler()}
      aria-label={`Trier par ${title}, ${sorted === 'desc' ? 'du plus ancien' : 'du plus récent'}`}
    >
      {title}
      <span aria-hidden="true" className="table__sort-glyph">
        {sorted === false ? '↕' : SORT_GLYPH[sorted]}
      </span>
    </button>
  );
};
