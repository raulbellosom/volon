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
      description="Cada fila es un solo enlace al detalle. Ícono, fecha y folio van agrupados; luego estado, importe y flecha. Si no caben en una línea (teléfono o texto grande), estado e importe bajan a una línea bajo el folio."
    >
      <DeliveryList aria-label={args['aria-label']}>
        <DeliveryListItem href="#a" title="18 oct 2026, 2:05 p.m." reference="VL-26-7K9M2Q" status="requested" statusLabel="Solicitado" amountMinor={6150} />
        <DeliveryListItem href="#b" title="18 oct 2026, 1:40 p.m." reference="VL-26-8N3R4T" status="in-transit" amountMinor={4800} />
        <DeliveryListItem href="#c" title="17 oct 2026, 7:12 p.m." reference="VL-26-9P4S5V" status="delivered" amountMinor={3500} />
      </DeliveryList>
    </Section>
  ),
};

/**
 * Edge cases for the browser geometry check: long prefixes and suffixes (2–4 letters, 6–10
 * characters, e.g. after a rebrand), long status and a long date. The folio must stay whole.
 */
export const LongReferences: Story = {
  render: (args) => (
    <Section title="Folios y textos largos" description="Ninguna fila debe desbordar ni recortar el folio, en ningún ancho ni tema.">
      <DeliveryList aria-label={args['aria-label']}>
        <DeliveryListItem href="#d" title="18 oct 2026, 11:59 p.m." reference="ABCD-26-7K9M2Q4X8Z" status="searching" amountMinor={1234567} />
        <DeliveryListItem href="#e" title="sábado, 31 de diciembre de 2026, 11:59:59 p.m." reference="AB-26-7K9M2Q" status="incident" statusLabel="Incidencia en revisión con soporte" amountMinor={99} />
        <DeliveryListItem href="#f" title="1 ene 2027, 0:05" reference="VL-26-7K9M2Q" status="failed" amountMinor={0} />
      </DeliveryList>
    </Section>
  ),
};
