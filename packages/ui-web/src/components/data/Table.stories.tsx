import type { Meta, StoryObj } from '@storybook/react-vite';
import { Inbox, MoreHorizontal, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { SortDescriptor } from 'react-aria-components';
import { Button } from '../actions/Button.tsx';
import { IconButton } from '../actions/IconButton.tsx';
import { StatusBadge, type DeliveryStatusTone } from '../content/StatusBadge.tsx';
import { EmptyState } from '../feedback/EmptyState.tsx';
import { Pagination } from '../navigation/Pagination.tsx';
import { Cell, Column, Row, Table, TableBody, TableFooter, TableFooterRow, TableHeader } from './Table.tsx';

const meta = {
  title: 'Datos/Table',
  component: Table,
  args: { 'aria-label': 'Envíos' },
} satisfies Meta<typeof Table>;

export default meta;
type Story = StoryObj<typeof meta>;

interface Delivery { id: string; folio: string; recipient: string; zone: string; status: DeliveryStatusTone; fee: number }

const STATUSES: DeliveryStatusTone[] = ['requested', 'searching', 'in-transit', 'delivered', 'incident'];
/** Synthetic rows; amounts are illustrative, not real tariffs. */
const DATA: Delivery[] = Array.from({ length: 23 }, (_, index) => ({
  id: `d${index}`,
  folio: `PV-${1000 + index}`,
  recipient: ['Ana López', 'Luis Pérez', 'Marta Ruiz', 'Jorge Díaz', 'Sofía Gil'][index % 5] ?? '',
  zone: ['Centro', 'Marina', 'Versalles', 'Pitillal'][index % 4] ?? '',
  status: STATUSES[index % STATUSES.length] ?? 'requested',
  fee: 4500 + (index % 6) * 750,
}));

const money = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
const PAGE_SIZE = 6;

function DeliveriesTable() {
  const [sort, setSort] = useState<SortDescriptor>({ column: 'folio', direction: 'ascending' });
  const [page, setPage] = useState(1);
  const sorted = useMemo(() => [...DATA].sort((a, b) => {
    const key = sort.column as keyof Delivery;
    const order = String(a[key]).localeCompare(String(b[key]), 'es', { numeric: true });
    return sort.direction === 'descending' ? -order : order;
  }), [sort]);
  const rows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const total = rows.reduce((sum, row) => sum + row.fee, 0);
  return (
    <div className="flex max-w-5xl flex-col gap-4">
      <Table aria-label="Envíos de hoy" selectionMode="multiple" sortDescriptor={sort} onSortChange={setSort}>
        <TableHeader>
          <Column id="folio" isRowHeader allowsSorting>Folio</Column>
          <Column id="recipient" allowsSorting>Destinatario</Column>
          <Column id="zone" allowsSorting>Zona</Column>
          <Column id="status">Estado</Column>
          <Column id="fee" align="end" allowsSorting>Tarifa</Column>
          <Column id="actions" align="end"><span className="sr-only">Acciones</span></Column>
        </TableHeader>
        <TableBody items={rows}>
          {(row) => (
            <Row id={row.id}>
              <Cell><span className="font-semibold">{row.folio}</span></Cell>
              <Cell>{row.recipient}</Cell>
              <Cell>{row.zone}</Cell>
              <Cell><StatusBadge status={row.status} size="sm" /></Cell>
              <Cell align="end">{money.format(row.fee / 100)}</Cell>
              <Cell align="end"><IconButton label={`Acciones de ${row.folio}`} icon={<MoreHorizontal />} size="sm" /></Cell>
            </Row>
          )}
        </TableBody>
        <TableFooter>
          <TableFooterRow id="total">
            <Cell>Subtotal de la página</Cell><Cell /><Cell /><Cell /><Cell align="end">{money.format(total / 100)}</Cell><Cell />
          </TableFooterRow>
        </TableFooter>
      </Table>
      <Pagination page={page} pageCount={Math.ceil(DATA.length / PAGE_SIZE)} pageSize={PAGE_SIZE} totalItems={DATA.length} onPageChange={setPage} />
    </div>
  );
}

export const Deliveries: Story = { render: () => <DeliveriesTable /> };

export const Empty: Story = {
  render: () => (
    <Table aria-label="Envíos" className="max-w-3xl">
      <TableHeader>
        <Column isRowHeader>Folio</Column>
        <Column>Destinatario</Column>
        <Column align="end">Tarifa</Column>
      </TableHeader>
      <TableBody renderEmptyState={() => (
        <EmptyState compact icon={<Inbox />} title="Aún no tienes envíos" description="Cuando solicites uno aparecerá aquí." actions={<Button leadingIcon={<Plus />}>Nuevo envío</Button>} />
      )}>
        {[]}
      </TableBody>
    </Table>
  ),
};
