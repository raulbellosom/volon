import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card, CardContent } from '../content/Card.tsx';
import { Section } from '../../gallery/Showcase.tsx';
import { RouteSummary } from './RouteSummary.tsx';

const PICKUP = { name: 'Sucursal Centro', address: 'Juárez 120, Centro', time: 'Recoger 14:05' };
const DROPOFF = { name: 'Ana López', address: 'Calle Venustiano Carranza 245, interior 4B, Col. Emiliano Zapata', time: 'Ventana 14:30 – 15:00' };

const meta = {
  title: 'Logística/RouteSummary',
  component: RouteSummary,
  args: { pickup: PICKUP, dropoff: DROPOFF, distanceMeters: 3240 },
} satisfies Meta<typeof RouteSummary>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <>
      <Section title="Completo" description="La estimación solo aparece si el servidor la tiene; nunca se inventa un tiempo de llegada.">
        <div className="grid max-w-4xl gap-5 md:grid-cols-2">
          <Card><CardContent className="py-5"><RouteSummary pickup={PICKUP} dropoff={DROPOFF} distanceMeters={3240} durationMinutes={18} /></CardContent></Card>
          <Card><CardContent className="py-5"><RouteSummary pickup={PICKUP} dropoff={DROPOFF} distanceMeters={850} /></CardContent></Card>
        </div>
      </Section>
      <Section title="Compacto (listas y tablas)">
        <RouteSummary compact pickup={PICKUP} dropoff={DROPOFF} distanceMeters={3240} durationMinutes={18} />
      </Section>
    </>
  ),
};
