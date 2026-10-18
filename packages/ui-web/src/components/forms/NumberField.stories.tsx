import type { Meta, StoryObj } from '@storybook/react-vite';
import { Boxes, Percent, Ruler, Weight } from 'lucide-react';
import { Section, Stack } from '../../gallery/Showcase.tsx';
import { NumberField } from './NumberField.tsx';

const meta = {
  title: 'Formularios/NumberField',
  component: NumberField,
  args: { label: 'Peso del paquete', icon: <Weight />, unit: 'kg', defaultValue: 2.5, minValue: 0, maxValue: 30, step: 0.5 },
} satisfies Meta<typeof NumberField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const States: Story = {
  render: () => (
    <>
      <Section title="Estados" description="↑/↓ cambian por el paso; Re Pág/Av Pág por 10 pasos; el valor se ajusta a mínimo y máximo al salir.">
        <Stack>
          <NumberField label="Bultos" icon={<Boxes />} defaultValue={1} minValue={1} maxValue={10} description="Entre 1 y 10." />
          <NumberField label="Distancia estimada" icon={<Ruler />} unit="km" defaultValue={3.2} formatOptions={{ maximumFractionDigits: 1 }} hideStepper />
          <NumberField label="Descuento" icon={<Percent />} formatOptions={{ style: 'percent' }} defaultValue={0.1} step={0.05} minValue={0} maxValue={1} />
          <NumberField label="Peso" icon={<Weight />} unit="kg" isInvalid defaultValue={42} errorMessage="El piloto acepta hasta 30 kg." />
          <NumberField label="Peso" icon={<Weight />} unit="kg" isDisabled defaultValue={5} />
          <NumberField label="Peso" icon={<Weight />} unit="kg" isReadOnly defaultValue={5} />
        </Stack>
      </Section>
      <Section title="Tamaños">
        <Stack>
          <NumberField label="Pequeño" size="sm" icon={<Boxes />} defaultValue={2} />
          <NumberField label="Grande" size="lg" icon={<Boxes />} defaultValue={2} />
        </Stack>
      </Section>
    </>
  ),
};
