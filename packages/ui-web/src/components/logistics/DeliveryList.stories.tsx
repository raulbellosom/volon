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
      description="Cada fila es un solo enlace al detalle. En teléfono se apila; desde sm se alinea en columnas. El folio largo se recorta en pantalla pero se lee completo."
    >
      <DeliveryList aria-label={args['aria-label']}>
        <DeliveryListItem href="#a" title="18 oct 2026, 2:05 p.m." reference="35855628-1965-4f53-9743-2cd76a27a6bf" status="requested" statusLabel="Solicitado" amountMinor={6150} />
        <DeliveryListItem href="#b" title="18 oct 2026, 1:40 p.m." reference="e9ed07fb-7495-4ecd-afb2-96d720dac5b9" status="in-transit" amountMinor={4800} />
        <DeliveryListItem href="#c" title="17 oct 2026, 7:12 p.m." reference="PV-1042" status="delivered" amountMinor={3500} />
      </DeliveryList>
    </Section>
  ),
};
