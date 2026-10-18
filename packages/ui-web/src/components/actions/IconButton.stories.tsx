import type { Meta, StoryObj } from '@storybook/react-vite';
import { Bell, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import { Row, Section } from '../../gallery/Showcase.tsx';
import { IconButton } from './IconButton.tsx';

const meta = {
  title: 'Acciones/IconButton',
  component: IconButton,
  args: { label: 'Agregar', icon: <Plus />, variant: 'ghost', size: 'md' },
} satisfies Meta<typeof IconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Overview: Story = {
  render: () => (
    <>
      <Section title="Variantes" description="Ghost es la variante por defecto: los íconos sueltos son acciones secundarias.">
        <Row>
          <IconButton label="Notificaciones" icon={<Bell />} />
          <IconButton label="Editar" icon={<Pencil />} variant="outline" />
          <IconButton label="Más opciones" icon={<MoreHorizontal />} variant="secondary" />
          <IconButton label="Nuevo envío" icon={<Plus />} variant="primary" />
          <IconButton label="Eliminar" icon={<Trash2 />} variant="danger" />
        </Row>
      </Section>
      <Section title="Tamaños y estados" description="El nombre accesible es obligatorio (prop label).">
        <Row>
          <IconButton label="Agregar" icon={<Plus />} variant="primary" size="sm" />
          <IconButton label="Agregar" icon={<Plus />} variant="primary" size="md" />
          <IconButton label="Agregar" icon={<Plus />} variant="primary" size="lg" />
          <IconButton label="Cargando" icon={<Plus />} variant="primary" isPending />
          <IconButton label="No disponible" icon={<Plus />} variant="primary" isDisabled />
        </Row>
      </Section>
    </>
  ),
};
