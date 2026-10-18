import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card } from '../content/Card.tsx';
import { Row, Section } from '../../gallery/Showcase.tsx';
import { Logo } from './Logo.tsx';

const meta = {
  title: 'Marca/Logo',
  component: Logo,
  args: { variant: 'wordmark', size: 'md' },
} satisfies Meta<typeof Logo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <>
      <Section title="Variantes" description="Arte oficial en PNG desde @delivery/branding; cambia a la versión blanca en tema oscuro. No hay SVG todavía.">
        <Row>
          <Logo variant="wordmark" size="lg" />
          <Logo variant="tagline" size="xl" />
          <Logo variant="symbol" size="lg" />
        </Row>
      </Section>
      <Section title="Sobre el panel de marca" description="onBrand fuerza el arte blanco en ambos temas.">
        <Card variant="brand" className="max-w-md items-start p-6"><Logo variant="tagline" size="xl" onBrand /></Card>
      </Section>
    </>
  ),
};
