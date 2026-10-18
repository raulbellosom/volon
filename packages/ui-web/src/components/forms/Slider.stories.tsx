import type { Meta, StoryObj } from '@storybook/react-vite';
import { Section, Stack } from '../../gallery/Showcase.tsx';
import { Slider } from './Slider.tsx';

const meta = {
  title: 'Formularios/Slider',
  component: Slider,
  args: { label: 'Radio de búsqueda', defaultValue: 3, minValue: 1, maxValue: 10, formatOptions: { style: 'unit', unit: 'kilometer' } },
} satisfies Meta<typeof Slider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <Section title="Valor y rango" description="Área táctil de 44 px; flechas, Inicio/Fin y Re Pág/Av Pág desde el teclado.">
      <Stack>
        <Slider label="Radio de búsqueda" defaultValue={3} minValue={1} maxValue={10} formatOptions={{ style: 'unit', unit: 'kilometer' }} />
        <Slider label="Horario de servicio" defaultValue={[12, 20]} minValue={8} maxValue={23} thumbLabels={['Inicio', 'Fin']} formatOptions={{ style: 'unit', unit: 'hour' }} />
        <Slider label="Propina sugerida" defaultValue={0.1} minValue={0} maxValue={0.2} step={0.05} formatOptions={{ style: 'percent' }} />
        <Slider label="Deshabilitado" defaultValue={5} isDisabled />
      </Stack>
    </Section>
  ),
};
