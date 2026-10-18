import type { Meta, StoryObj } from '@storybook/react-vite';
import { Bike, Car, FileText, Gift, Package, Soup, Truck } from 'lucide-react';
import { Badge } from '../content/Badge.tsx';
import { Section } from '../../gallery/Showcase.tsx';
import { CheckboxGroup } from './Checkbox.tsx';
import { CheckboxCard, RadioCard } from './ChoiceCard.tsx';
import { RadioGroup } from './RadioGroup.tsx';

const meta = {
  title: 'Formularios/ChoiceCard',
  component: RadioCard,
  args: { value: 'moto', icon: <Bike />, title: 'Moto' },
} satisfies Meta<typeof RadioCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  render: () => (
    <div className="max-w-2xl">
      <Section title="RadioCard" description="Opciones grandes y táctiles. Una columna en teléfono, dos desde tableta. Las flechas cambian la selección.">
        <RadioGroup label="¿En qué se entrega?" layout="cards" defaultValue="moto">
          <RadioCard value="moto" icon={<Bike />} title="Moto" description="Paquetes chicos, hasta 5 kg." meta={<Badge size="sm" tone="brand">Piloto</Badge>} />
          <RadioCard value="car" icon={<Car />} title="Auto" description="Hasta 30 kg o varios bultos." />
          <RadioCard value="van" icon={<Truck />} title="Camioneta" description="Aún no disponible en tu zona." isDisabled />
        </RadioGroup>
      </Section>
      <Section title="CheckboxCard">
        <CheckboxGroup label="¿Qué sueles enviar?" layout="cards" defaultValue={['food']} description="Puedes elegir varias.">
          <CheckboxCard value="food" icon={<Soup />} title="Comida preparada" />
          <CheckboxCard value="parcel" icon={<Package />} title="Paquetes" />
          <CheckboxCard value="docs" icon={<FileText />} title="Documentos" />
          <CheckboxCard value="gifts" icon={<Gift />} title="Regalos" description="Envoltura no incluida." />
        </CheckboxGroup>
      </Section>
    </div>
  ),
};
