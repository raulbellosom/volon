import type { Meta, StoryObj } from '@storybook/react-vite';
import { Section } from '../../gallery/Showcase.tsx';
import { Breadcrumbs } from './Breadcrumbs.tsx';

const meta = {
  title: 'Navegación/Breadcrumbs',
  component: Breadcrumbs,
  args: {
    items: [
      { id: 'home', label: 'Inicio', href: '#inicio' },
      { id: 'deliveries', label: 'Envíos', href: '#envios' },
      { id: 'current', label: 'PV-1042' },
    ],
  },
} satisfies Meta<typeof Breadcrumbs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const LongLabels: Story = {
  render: () => (
    <Section title="Etiquetas largas" description="Cada tramo se recorta con «…»; en teléfono solo aparece el enlace de regreso al nivel anterior.">
      <Breadcrumbs
        items={[
          { id: 'a', label: 'Sucursales', href: '#s' },
          { id: 'b', label: 'Comercializadora de productos regionales de la Bahía', href: '#c' },
          { id: 'c', label: 'Configuración de horarios de recogida' },
        ]}
      />
    </Section>
  ),
};
