import type { Meta, StoryObj } from '@storybook/react-vite';
import { ArrowRight, Download } from 'lucide-react';
import { Row, Section } from '../../gallery/Showcase.tsx';
import { Link, LinkButton } from './Link.tsx';

const meta = {
  title: 'Acciones/Link',
  component: Link,
  args: { href: '#', children: 'Ver términos del servicio' },
} satisfies Meta<typeof Link>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Overview: Story = {
  render: () => (
    <>
      <Section title="En texto y sueltos" description="Los enlaces navegan; las acciones que cambian datos usan Button.">
        <p className="max-w-xl text-md text-text-primary">
          Antes de tu primer envío revisa la <Link href="#empaque">guía de empaque</Link> y los{' '}
          <Link href="https://example.com" external>términos del piloto</Link>.
        </p>
        <Row>
          <Link href="#envios" variant="standalone">Ver todos los envíos</Link>
          <Link href="#ayuda" variant="standalone" isDisabled>Centro de ayuda (no disponible)</Link>
        </Row>
      </Section>
      <Section title="LinkButton" description="Navegación con aspecto de botón: conserva el rol de enlace (abre en otra pestaña con clic medio, se puede copiar).">
        <Row>
          <LinkButton href="#nuevo" variant="primary" trailingIcon={<ArrowRight />}>Solicitar envío</LinkButton>
          <LinkButton href="#guia" variant="outline" leadingIcon={<Download />}>Descargar guía</LinkButton>
          <LinkButton href="https://example.com" variant="ghost" external>Sitio de ayuda</LinkButton>
        </Row>
      </Section>
    </>
  ),
};
