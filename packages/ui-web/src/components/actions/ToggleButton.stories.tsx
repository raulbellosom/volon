import type { Meta, StoryObj } from '@storybook/react-vite';
import { Bell, Flame, Star } from 'lucide-react';
import { Row, Section } from '../../gallery/Showcase.tsx';
import { ToggleButton } from './ToggleButton.tsx';

const meta = {
  title: 'Acciones/ToggleButton',
  component: ToggleButton,
  args: { children: 'Solo urgentes', icon: <Flame /> },
} satisfies Meta<typeof ToggleButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Overview: Story = {
  render: () => (
    <Section title="Estados" description="Presionado usa la pareja de selección de marca. La etiqueta no cambia entre estados; lo anuncia aria-pressed.">
      <Row>
        <ToggleButton icon={<Flame />}>Solo urgentes</ToggleButton>
        <ToggleButton icon={<Flame />} defaultSelected>Solo urgentes</ToggleButton>
        <ToggleButton icon={<Star />} label="Favorito" />
        <ToggleButton icon={<Bell />} label="Avisos" defaultSelected size="sm" />
        <ToggleButton isDisabled>No disponible</ToggleButton>
      </Row>
    </Section>
  ),
};
