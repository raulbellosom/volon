import type { Meta, StoryObj } from '@storybook/react-vite';
import { Section, Stack } from '../../gallery/Showcase.tsx';
import { Progress } from './Progress.tsx';

const meta = {
  title: 'Retroalimentación/Progress',
  component: Progress,
  args: { label: 'Configuración de tu sucursal', value: 60 },
} satisfies Meta<typeof Progress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Overview: Story = {
  render: () => (
    <Section title="Tonos y modos" description="El indeterminado se mueve; con «reducir movimiento» queda fijo y atenuado.">
      <Stack>
        <Progress label="Configuración de tu sucursal" value={60} />
        <Progress label="Capacidad del turno" value={92} tone="warning" />
        <Progress label="Entregas a tiempo" value={98} tone="success" />
        <Progress label="Envíos con incidencia" value={8} tone="danger" size="sm" />
        <Progress label="Buscando repartidor" isIndeterminate />
        <Progress aria-label="Subiendo foto" value={30} hideValue size="sm" />
        <Progress label="Etiqueta muy larga para comprobar cómo se acomoda el porcentaje en pantallas angostas" value={45} />
      </Stack>
    </Section>
  ),
};
