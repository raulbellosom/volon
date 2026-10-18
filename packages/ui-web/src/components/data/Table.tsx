import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  Cell as AriaCell,
  Collection,
  Column as AriaColumn,
  Row as AriaRow,
  Table as AriaTable,
  TableBody as AriaTableBody,
  TableFooter as AriaTableFooter,
  TableHeader as AriaTableHeader,
  useTableOptions,
  type CellProps as AriaCellProps,
  type ColumnProps as AriaColumnProps,
  type RowProps as AriaRowProps,
  type TableBodyProps as AriaTableBodyProps,
  type TableHeaderProps as AriaTableHeaderProps,
  type TableProps as AriaTableProps,
} from 'react-aria-components';
import { cx, withStyles } from '../../utils/cx.ts';
import { Checkbox } from '../forms/Checkbox.tsx';

export type CellAlign = 'start' | 'end';
const ALIGN: Record<CellAlign, string> = { start: 'text-start', end: 'text-end tabular-nums' };

export interface TableProps extends Omit<AriaTableProps, 'className'> {
  /** Required: names the table for assistive tech. */
  'aria-label': string;
  className?: string;
}

/** Data table with sorting, keyboard navigation and selection. Scrolls horizontally on phones. */
export function Table({ className, ...props }: TableProps) {
  return (
    <div className={cx('w-full overflow-x-auto rounded-xl border border-border-subtle bg-surface', className)}>
      <AriaTable {...props} className="w-full border-separate border-spacing-0 text-md text-text-primary outline-none" />
    </div>
  );
}

export function TableHeader<T extends object>({ columns, children }: Pick<AriaTableHeaderProps<T>, 'columns' | 'children'>) {
  const { selectionBehavior, selectionMode } = useTableOptions();
  return (
    <AriaTableHeader className="bg-surface-sunken">
      {selectionBehavior === 'toggle' && (
        <AriaColumn className="w-12 border-b border-border-subtle ps-4">{selectionMode === 'multiple' && <Checkbox slot="selection" />}</AriaColumn>
      )}
      <Collection {...(columns ? { items: columns } : {})}>{children}</Collection>
    </AriaTableHeader>
  );
}

export interface ColumnProps extends Omit<AriaColumnProps, 'children' | 'className'> {
  children: ReactNode;
  align?: CellAlign;
}

export function Column({ children, align = 'start', ...props }: ColumnProps) {
  return (
    <AriaColumn
      {...props}
      className={cx(
        'h-11 border-b border-border-subtle px-4 text-xs font-bold uppercase tracking-overline whitespace-nowrap text-text-secondary',
        'outline-none data-focus-visible:outline-2 data-focus-visible:-outline-offset-2 data-focus-visible:outline-focus-ring',
        'data-allows-sorting:cursor-pointer data-hovered:text-text-primary',
        ALIGN[align],
      )}
    >
      {({ allowsSorting, sortDirection }) => (
        <span className={cx('inline-flex items-center gap-1.5', align === 'end' && 'flex-row-reverse')}>
          {children}
          {allowsSorting && (
            <span aria-hidden="true" className={cx('[&_svg]:size-3.5', !sortDirection && 'opacity-40')}>
              {sortDirection === 'ascending' ? <ArrowUp /> : sortDirection === 'descending' ? <ArrowDown /> : <ChevronsUpDown />}
            </span>
          )}
        </span>
      )}
    </AriaColumn>
  );
}

export function TableBody<T extends object>({ className, ...props }: Omit<AriaTableBodyProps<T>, 'className'> & { className?: string }) {
  return <AriaTableBody {...props} className={withStyles(className, () => 'empty:[&>tr>td]:border-0')} />;
}

const ROW = cx(
  'group/row outline-none transition-colors duration-(--duration-instant)',
  'data-hovered:bg-surface-hover data-selected:bg-surface-selected data-pressed:bg-surface-selected',
  'data-focus-visible:outline-2 data-focus-visible:-outline-offset-2 data-focus-visible:outline-focus-ring',
  'data-href:cursor-pointer data-disabled:text-text-disabled',
);

export function Row<T extends object>({ id, columns, children, ...props }: Omit<AriaRowProps<T>, 'className'>) {
  const { selectionBehavior } = useTableOptions();
  return (
    <AriaRow {...(id !== undefined ? { id } : {})} {...props} className={ROW}>
      {selectionBehavior === 'toggle' && (
        <AriaCell className="border-b border-border-subtle ps-4 group-last/row:border-b-0"><Checkbox slot="selection" /></AriaCell>
      )}
      <Collection {...(columns ? { items: columns } : {})}>{children}</Collection>
    </AriaRow>
  );
}

export interface CellProps extends Omit<AriaCellProps, 'className'> {
  align?: CellAlign;
  /** Allow line breaks for long text (addresses, notes). Off by default so IDs never split. */
  wrap?: boolean;
}

export function Cell({ align = 'start', wrap, ...props }: CellProps) {
  return (
    <AriaCell
      {...props}
      className={cx(
        'border-b border-border-subtle px-4 py-3 align-middle group-last/row:border-b-0',
        'outline-none data-focus-visible:outline-2 data-focus-visible:-outline-offset-2 data-focus-visible:outline-focus-ring',
        ALIGN[align],
        !wrap && 'whitespace-nowrap',
      )}
    />
  );
}

/** Row for TableFooter: keeps the selection column empty instead of showing a checkbox. */
export function TableFooterRow({ id, children }: { id: string; children: ReactNode }) {
  const { selectionBehavior } = useTableOptions();
  return (
    <AriaRow id={id} className="outline-none">
      {selectionBehavior === 'toggle' && <AriaCell className="ps-4" />}
      {children}
    </AriaRow>
  );
}

/** Totals or summary rows; rendered in a `<tfoot>` with a stronger divider. */
export function TableFooter({ children }: { children: ReactNode }) {
  return <AriaTableFooter className="bg-surface-sunken font-bold [&_td]:border-t-2 [&_td]:border-border-subtle">{children}</AriaTableFooter>;
}
