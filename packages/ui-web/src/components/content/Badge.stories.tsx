import type { Meta, StoryObj } from '@storybook/react-vite';
import { Sparkles, Zap } from 'lucide-react';
import { Row, Section } from '../../gallery/Showcase.tsx';
import { Badge, type BadgeTone } from './Badge.tsx';

const TONES: BadgeTone[] = ['neutral', 'info', 'success', 'warning', 'danger', 'brand', 'accent'];

const meta = {
  title: 'Contenido/Badge',
  component: Badge,
  args: { children: 'Nuevo', tone: 'info' },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Tones: Story = {
  render: () => (
    <>
      <Section title="Tonos" description="Brand (azul profundo + lima) es la combinación firma de Volon; úsala para lo propio de la marca.">
        <Row>{TONES.map((tone) => <Badge key={tone} tone={tone}>{tone}</Badge>)}</Row>
      </Section>
      <Section title="Tamaños e íconos">
        <Row>
          <Badge size="sm" tone="brand" icon={<Zap />}>Express</Badge>
          <Badge size="md" tone="accent" icon={<Sparkles />}>Nuevo</Badge>
          <Badge size="sm">12 envíos</Badge>
        </Row>
      </Section>
    </>
  ),
};
