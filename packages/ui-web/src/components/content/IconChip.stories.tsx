import type { Meta, StoryObj } from '@storybook/react-vite';
import { Bike, CircleAlert, CircleCheck, Info, MapPin, Store, TriangleAlert } from 'lucide-react';
import { Row, Section } from '../../gallery/Showcase.tsx';
import { IconChip } from './IconChip.tsx';

const meta = {
  title: 'Contenido/IconChip',
  component: IconChip,
  args: { icon: <Store />, tone: 'brand', size: 'md' },
} satisfies Meta<typeof IconChip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Tones: Story = {
  render: () => (
    <>
      <Section title="Tonos" description="Ancla visual de encabezados, modales, listas y tarjetas seleccionables. Siempre decorativo: el texto lleva el significado.">
        <Row>
          <IconChip icon={<Store />} tone="brand" />
          <IconChip icon={<Bike />} tone="accent" />
          <IconChip icon={<Info />} tone="info" />
          <IconChip icon={<CircleCheck />} tone="success" />
          <IconChip icon={<TriangleAlert />} tone="warning" />
          <IconChip icon={<CircleAlert />} tone="danger" />
          <IconChip icon={<MapPin />} tone="neutral" />
        </Row>
      </Section>
      <Section title="Tamaños">
        <Row>
          <IconChip icon={<Bike />} tone="accent" size="sm" />
          <IconChip icon={<Bike />} tone="accent" size="md" />
          <IconChip icon={<Bike />} tone="accent" size="lg" />
        </Row>
      </Section>
    </>
  ),
};
