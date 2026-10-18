import type { Meta, StoryObj } from '@storybook/react-vite';
import { HandCoins } from 'lucide-react';
import { useState } from 'react';
import { Section, Stack } from '../../gallery/Showcase.tsx';
import { CurrencyField } from './CurrencyField.tsx';

const meta = {
  title: 'Formularios/CurrencyField',
  component: CurrencyField,
  args: { label: 'Valor declarado', defaultValueMinor: 125050 },
} satisfies Meta<typeof CurrencyField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

function Controlled() {
  const [minor, setMinor] = useState<number | null>(45000);
  return (
    <Stack>
      <CurrencyField label="Cobro al destinatario" icon={<HandCoins />} valueMinor={minor} onChangeMinor={setMinor} description="Ejemplo: escribe 1250.5 y sal del campo." />
      <p className="text-sm text-text-secondary">
        Valor entregado a la app: <code className="font-semibold text-text-primary">{minor === null ? 'null' : `${minor} centavos`}</code>
      </p>
    </Stack>
  );
}

export const MinorUnits: Story = {
  render: () => (
    <>
      <Section title="Centavos enteros" description="El campo muestra pesos con formato es-MX y entrega centavos enteros, igual que el dominio de precios. Nunca viajan flotantes.">
        <Controlled />
      </Section>
      <Section title="Estados">
        <Stack>
          <CurrencyField label="Monto máximo" maxValueMinor={500000} defaultValueMinor={600000} isInvalid errorMessage="El máximo es $5,000.00." />
          <CurrencyField label="Monto" isDisabled defaultValueMinor={9900} />
          <CurrencyField label="Monto" isReadOnly defaultValueMinor={9900} />
        </Stack>
      </Section>
    </>
  ),
};
