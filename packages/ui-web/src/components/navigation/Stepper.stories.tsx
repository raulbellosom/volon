import type { Meta, StoryObj } from '@storybook/react-vite';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../actions/Button.tsx';
import { Card, CardContent, CardFooter } from '../content/Card.tsx';
import { Section } from '../../gallery/Showcase.tsx';
import { Stepper, type Step } from './Stepper.tsx';

const STEPS: Step[] = [
  { id: 'branch', label: 'Sucursal', description: 'Nombre y dirección' },
  { id: 'hours', label: 'Horario', description: 'Ventanas de recogida' },
  { id: 'payment', label: 'Pago', description: 'Método para la logística' },
  { id: 'review', label: 'Revisión' },
];

const meta = {
  title: 'Navegación/Stepper',
  component: Stepper,
  args: { 'aria-label': 'Alta de sucursal', steps: STEPS, currentIndex: 1 },
} satisfies Meta<typeof Stepper>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

function Flow() {
  const [index, setIndex] = useState(1);
  return (
    <Card className="max-w-3xl">
      <CardContent className="py-6"><Stepper aria-label="Alta de sucursal" steps={STEPS} currentIndex={index} /></CardContent>
      <CardFooter align="between">
        <Button variant="ghost" leadingIcon={<ArrowLeft />} isDisabled={index === 0} onPress={() => setIndex((value) => value - 1)}>Atrás</Button>
        <Button trailingIcon={<ArrowRight />} isDisabled={index === STEPS.length} onPress={() => setIndex((value) => value + 1)}>Continuar</Button>
      </CardFooter>
    </Card>
  );
}

export const Interactive: Story = {
  render: () => (
    <>
      <Section title="Horizontal" description="En teléfono se resume como «Paso 2 de 4: Horario».">
        <Flow />
      </Section>
      <Section title="Vertical">
        <Stepper aria-label="Alta de sucursal" steps={STEPS} currentIndex={2} orientation="vertical" className="max-w-sm" />
      </Section>
    </>
  ),
};
