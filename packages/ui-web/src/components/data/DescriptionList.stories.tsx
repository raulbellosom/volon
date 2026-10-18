import type { Meta, StoryObj } from '@storybook/react-vite';
import { Clock, Hash, MapPin, Package, Phone, User } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../content/Card.tsx';
import { StatusBadge } from '../content/StatusBadge.tsx';
import { Section } from '../../gallery/Showcase.tsx';
import { DescriptionList, type DescriptionItem } from './DescriptionList.tsx';

const meta = {
  title: 'Datos/DescriptionList',
  component: DescriptionList,
  args: { items: [] },
} satisfies Meta<typeof DescriptionList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Synthetic delivery details. */
const ITEMS: DescriptionItem[] = [
  { term: 'Folio', description: 'PV-1042', icon: <Hash /> },
  { term: 'Estado', description: <StatusBadge status="in-transit" size="sm" />, icon: <Package /> },
  { term: 'Destinatario', description: 'Ana López', icon: <User /> },
  { term: 'Teléfono', description: '33 1234 5678', icon: <Phone /> },
  { term: 'Dirección', description: 'Calle Venustiano Carranza 245, interior 4B, Col. Emiliano Zapata, Puerto Vallarta, Jal.', icon: <MapPin /> },
  { term: 'Ventana', description: '14:00 – 15:00', icon: <Clock /> },
];

export const Layouts: Story = {
  render: () => (
    <>
      <Section title="Inline (paneles de detalle)" description="Término a la izquierda y valor a la derecha; en teléfono se apilan. Los textos largos se ajustan.">
        <Card className="max-w-2xl"><CardHeader title="Envío PV-1042" /><CardContent><DescriptionList items={ITEMS} /></CardContent></Card>
      </Section>
      <Section title="Grid (resúmenes)">
        <DescriptionList layout="grid" items={ITEMS.slice(0, 4)} className="max-w-3xl" />
      </Section>
      <Section title="Stacked (columnas angostas)">
        <DescriptionList layout="stacked" items={ITEMS.slice(0, 3)} className="max-w-xs" />
      </Section>
    </>
  ),
};
