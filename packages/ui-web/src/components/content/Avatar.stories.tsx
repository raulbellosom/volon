import type { Meta, StoryObj } from '@storybook/react-vite';
import { Row, Section } from '../../gallery/Showcase.tsx';
import { Avatar, AvatarGroup } from './Avatar.tsx';

const meta = {
  title: 'Contenido/Avatar',
  component: Avatar,
  args: { name: 'Ana María López', size: 'md' },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

const COURIERS = ['Ana López', 'Luis Pérez', 'Marta Ruiz', 'Jorge Díaz', 'Sofía Gil', 'Iván Sol'].map((name) => ({ name }));

export const Overview: Story = {
  render: () => (
    <>
      <Section title="Tamaños" description="Iniciales como respaldo mientras carga la foto o si falla. Nombres sintéticos.">
        <Row>
          <Avatar name="Ana López" size="sm" />
          <Avatar name="Luis Pérez" size="md" />
          <Avatar name="Taquería El Muelle" size="lg" />
          <Avatar name="Marta Ruiz" size="xl" />
          <Avatar name="Foto rota" src="/no-existe.png" size="lg" />
        </Row>
      </Section>
      <Section title="Disponibilidad" description="El punto siempre va acompañado del texto en el nombre accesible.">
        <Row>
          <Avatar name="Ana López" status="online" size="lg" />
          <Avatar name="Luis Pérez" status="busy" size="lg" />
          <Avatar name="Marta Ruiz" status="offline" size="lg" />
        </Row>
      </Section>
      <Section title="Grupo">
        <Row>
          <AvatarGroup people={COURIERS} max={4} />
          <AvatarGroup people={COURIERS.slice(0, 3)} size="sm" />
        </Row>
      </Section>
    </>
  ),
};
