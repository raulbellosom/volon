import type { Meta, StoryObj } from '@storybook/react-vite';
import { Section } from '../../gallery/Showcase.tsx';
import { DeliveryList, DeliveryListItem } from './DeliveryList.tsx';

const meta = {
  title: 'Logística/DeliveryList',
  component: DeliveryList,
  args: { 'aria-label': 'Envíos de Sucursal Centro', children: null },
} satisfies Meta<typeof DeliveryList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Synthetic examples; amounts are illustrative, not a rate. */
export const History: Story = {
  render: (args) => (
    <Section
      title="Historial de envíos"
      description="Cada fila enlaza al detalle por su ID técnico. El folio corto se muestra completo en su propia línea, también en teléfono."
    >
      <DeliveryList aria-label={args['aria-label']}>
        <DeliveryListItem href="#a" title="18 oct 2026, 2:05 p.m." reference="VL-26-7K9M2Q" status="requested" statusLabel="Solicitado" amountMinor={6150} />
        <DeliveryListItem href="#b" title="18 oct 2026, 1:40 p.m." reference="VL-26-8N3R4T" status="in-transit" amountMinor={4800} />
        <DeliveryListItem href="#c" title="17 oct 2026, 7:12 p.m." reference="VL-26-9P4S5V" status="delivered" amountMinor={3500} />
      </DeliveryList>
    </Section>
  ),
};
