import type { Meta, StoryObj } from '@storybook/react-vite';
import { TriangleAlert } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../content/Card.tsx';
import { Timeline, type TimelineEvent } from './Timeline.tsx';

/** Synthetic delivery history. States come from the server in real apps. */
const EVENTS: TimelineEvent[] = [
  { id: 'requested', title: 'Envío solicitado', time: '13:40', state: 'done', description: 'Sucursal Centro · pago verificado' },
  { id: 'assigned', title: 'Repartidor asignado', time: '13:46', state: 'done', description: 'Luis Pérez · moto' },
  { id: 'picked', title: 'Paquete recogido', time: '14:05', state: 'current', description: 'Rumbo a Versalles' },
  { id: 'delivered', title: 'Entregado', state: 'upcoming' },
];

const meta = {
  title: 'Logística/Timeline',
  component: Timeline,
  args: { 'aria-label': 'Historial del envío', events: EVENTS },
} satisfies Meta<typeof Timeline>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const InCard: Story = {
  render: () => (
    <div className="grid max-w-4xl gap-5 md:grid-cols-2">
      <Card><CardHeader title="Envío PV-1042" description="Historial" /><CardContent><Timeline aria-label="Historial del envío PV-1042" events={EVENTS} /></CardContent></Card>
      <Card>
        <CardHeader title="Envío PV-1043" description="Con incidencia" />
        <CardContent>
          <Timeline
            aria-label="Historial del envío PV-1043"
            events={[
              { id: 'r', title: 'Envío solicitado', time: '12:10', state: 'done' },
              { id: 'p', title: 'Negocio cerrado al llegar', time: '12:32', state: 'problem', icon: <TriangleAlert aria-hidden="true" />, description: 'El operador está revisando la incidencia con el comercio.' },
              { id: 'd', title: 'Entrega', state: 'upcoming' },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  ),
};
