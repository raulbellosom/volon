import type { Meta, StoryObj } from '@storybook/react-vite';
import { CircleCheck, Clock, Plus, Truck, Zap } from 'lucide-react';
import { Button } from '../components/actions/Button.tsx';
import { Card, CardContent, CardHeader } from '../components/content/Card.tsx';
import { StatusBadge, type DeliveryStatusTone } from '../components/content/StatusBadge.tsx';
import { Cell, Column, Row, Table, TableBody, TableHeader } from '../components/data/Table.tsx';
import { Navbar } from '../components/navigation/Navbar.tsx';
import { SiteFooter } from '../components/navigation/SiteFooter.tsx';
import { Tab, TabList, TabPanel, Tabs } from '../components/navigation/Tabs.tsx';
import { FOOTER_COLUMNS, NAV_ACTIONS, NAV_ITEMS } from './nav-fixtures.tsx';

const meta = { title: 'Patrones/Página de ejemplo', parameters: { layout: 'fullscreen' } } satisfies Meta;
export default meta;

const ROWS: { id: string; folio: string; recipient: string; status: DeliveryStatusTone; eta: string }[] = [
  { id: '1', folio: 'PV-1042', recipient: 'Ana López', status: 'in-transit', eta: '14:20' },
  { id: '2', folio: 'PV-1043', recipient: 'Luis Pérez', status: 'searching', eta: '—' },
  { id: '3', folio: 'PV-1044', recipient: 'Marta Ruiz', status: 'requested', eta: '—' },
  { id: '4', folio: 'PV-1039', recipient: 'Jorge Díaz', status: 'delivered', eta: '13:05' },
];

const STATS = [
  { title: 'En camino', value: '5', icon: <Truck />, tone: 'brand' as const },
  { title: 'Pendientes', value: '2', icon: <Clock />, tone: 'warning' as const },
  { title: 'Entregados hoy', value: '12', icon: <CircleCheck />, tone: 'success' as const },
];

/** Composition check only: synthetic data, no backend, not an approved business screen. */
export const MerchantOverview: StoryObj = {
  render: () => (
    <div className="flex min-h-dvh flex-col">
      <Navbar items={NAV_ITEMS} currentId="deliveries" actions={NAV_ACTIONS} />
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-overline text-text-secondary">Sucursal Centro · ejemplo</p>
            <h1 className="text-3xl font-extrabold tracking-tight">Envíos de hoy</h1>
          </div>
          <Button leadingIcon={<Plus />}>Nuevo envío</Button>
        </header>
        <section aria-label="Resumen" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card variant="brand" className="sm:col-span-2 lg:col-span-1">
            <CardHeader icon={<Zap />} overline="Pídelo de Volon" title="98% a tiempo" description="Promedio de la semana" />
            <CardContent />
          </Card>
          {STATS.map((stat) => (
            <Card key={stat.title}>
              <CardHeader icon={stat.icon} iconTone={stat.tone} title={stat.value} description={stat.title} />
              <CardContent />
            </Card>
          ))}
        </section>
        <Tabs defaultSelectedKey="today">
          <TabList aria-label="Periodo">
            <Tab id="today" count={ROWS.length}>Hoy</Tab>
            <Tab id="week">Semana</Tab>
          </TabList>
          <TabPanel id="today">
            <Table aria-label="Envíos de hoy">
              <TableHeader>
                <Column isRowHeader>Folio</Column>
                <Column>Destinatario</Column>
                <Column>Estado</Column>
                <Column align="end">Hora</Column>
              </TableHeader>
              <TableBody items={ROWS}>
                {(row) => (
                  <Row id={row.id}>
                    <Cell><span className="font-semibold">{row.folio}</span></Cell>
                    <Cell>{row.recipient}</Cell>
                    <Cell><StatusBadge status={row.status} size="sm" /></Cell>
                    <Cell align="end">{row.eta}</Cell>
                  </Row>
                )}
              </TableBody>
            </Table>
          </TabPanel>
          <TabPanel id="week"><p className="text-text-secondary">Resumen semanal de ejemplo.</p></TabPanel>
        </Tabs>
      </main>
      <SiteFooter columns={FOOTER_COLUMNS} tone="brand" legal={<span>© 2026 Volon · Datos sintéticos</span>} />
    </div>
  ),
};
