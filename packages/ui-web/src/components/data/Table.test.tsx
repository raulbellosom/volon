import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Inbox } from 'lucide-react';
import { useState } from 'react';
import type { SortDescriptor } from 'react-aria-components';
import { describe, expect, it, vi } from 'vitest';
import { EmptyState } from '../feedback/EmptyState.tsx';
import { Cell, Column, Row, Table, TableBody, TableFooter, TableFooterRow, TableHeader } from './Table.tsx';

const ROWS = [
  { id: 'a', folio: 'PV-2', total: 120 },
  { id: 'b', folio: 'PV-1', total: 80 },
];

function SortableTable({ onSelectionChange }: { onSelectionChange?: (keys: unknown) => void }) {
  const [sort, setSort] = useState<SortDescriptor>({ column: 'folio', direction: 'ascending' });
  const rows = [...ROWS].sort((first, second) => {
    const order = first.folio.localeCompare(second.folio);
    return sort.direction === 'descending' ? -order : order;
  });
  return (
    <Table aria-label="Envíos" sortDescriptor={sort} onSortChange={setSort} selectionMode="multiple" {...(onSelectionChange ? { onSelectionChange } : {})}>
      <TableHeader>
        <Column id="folio" isRowHeader allowsSorting>Folio</Column>
        <Column id="total" align="end">Total</Column>
      </TableHeader>
      <TableBody items={rows}>
        {(row) => <Row id={row.id}><Cell>{row.folio}</Cell><Cell align="end">{row.total}</Cell></Row>}
      </TableBody>
      <TableFooter><TableFooterRow id="sum"><Cell>Total</Cell><Cell align="end">200</Cell></TableFooterRow></TableFooter>
    </Table>
  );
}

/** Folio order inside the body only (the footer row also has a row header). */
const bodyFolios = () =>
  within(screen.getAllByRole('rowgroup')[1] as HTMLElement).getAllByRole('rowheader').map((cell) => cell.textContent);

describe('Table', () => {
  it('sorts by a sortable column and announces the direction', async () => {
    render(<SortableTable />);
    const header = screen.getByRole('columnheader', { name: /Folio/ });
    expect(header).toHaveAttribute('aria-sort', 'ascending');
    expect(bodyFolios()).toEqual(['PV-1', 'PV-2']);
    await userEvent.click(header);
    expect(header).toHaveAttribute('aria-sort', 'descending');
    expect(bodyFolios()).toEqual(['PV-2', 'PV-1']);
  });

  it('selects rows with the Volon checkbox and renders a footer row', async () => {
    const onSelectionChange = vi.fn();
    render(<SortableTable onSelectionChange={onSelectionChange} />);
    const firstRow = screen.getAllByRole('row')[1] as HTMLElement;
    await userEvent.click(within(firstRow).getByRole('checkbox'));
    expect(onSelectionChange).toHaveBeenCalled();
    expect(screen.getByText('200')).toBeInTheDocument();
  });

  it('shows an empty state when there are no rows', () => {
    render(
      <Table aria-label="Vacía">
        <TableHeader><Column isRowHeader>Folio</Column></TableHeader>
        <TableBody renderEmptyState={() => <EmptyState compact icon={<Inbox />} title="Sin envíos todavía" />}>{[]}</TableBody>
      </Table>,
    );
    expect(screen.getByText('Sin envíos todavía')).toBeInTheDocument();
  });
});
