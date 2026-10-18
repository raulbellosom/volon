import type { Meta, StoryObj } from '@storybook/react-vite';
import { Row } from '../../gallery/Showcase.tsx';
import { Spinner } from './Spinner.tsx';

const meta = {
  title: 'Retroalimentación/Spinner',
  component: Spinner,
  args: { label: 'Cargando envíos', size: 'md' },
} satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Sizes: Story = {
  render: () => (
    <Row>
      <Spinner size="sm" />
      <Spinner size="md" />
      <Spinner size="lg" />
      <span className="flex items-center gap-2 text-sm text-text-secondary"><Spinner size="sm" label="Buscando repartidor" />Buscando repartidor…</span>
    </Row>
  ),
};
