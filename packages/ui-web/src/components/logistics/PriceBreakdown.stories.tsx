import type { Meta, StoryObj } from '@storybook/react-vite';
import { Receipt } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../content/Card.tsx';
import { PriceBreakdown } from './PriceBreakdown.tsx';

const meta = {
  title: 'Logística/PriceBreakdown',
  component: PriceBreakdown,
  args: {
    lines: [
      { id: 'base', label: 'Tarifa base', amountMinor: 4500 },
      { id: 'distance', label: 'Distancia de ruta', amountMinor: 1500, hint: '3.2 km · 1 km adicional' },
    ],
    totalMinor: 6000,
  },
} satisfies Meta<typeof PriceBreakdown>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** Illustrative amounts only; real tariffs come from approved server policies. */
export const QuoteCard: Story = {
  render: () => (
    <Card className="max-w-sm">
      <CardHeader icon={<Receipt />} title="Cotización" description="Montos de ejemplo, no tarifas reales." />
      <CardContent>
        <PriceBreakdown
          lines={[
            { id: 'base', label: 'Tarifa base', amountMinor: 4500 },
            { id: 'distance', label: 'Distancia de ruta', amountMinor: 1500, hint: '3.2 km · 1 km adicional' },
            { id: 'promo', label: 'Primer envío', amountMinor: 1000, kind: 'discount' },
          ]}
          totalMinor={5000}
          footnote="Precio válido por 10 minutos. Lo calcula el servidor con la ruta real."
        />
      </CardContent>
    </Card>
  ),
};
