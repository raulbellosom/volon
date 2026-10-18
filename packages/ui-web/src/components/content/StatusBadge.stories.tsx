import type { Meta, StoryObj } from '@storybook/react-vite';
import { Row, Section } from '../../gallery/Showcase.tsx';
import { StatusBadge, type DeliveryStatusTone } from './StatusBadge.tsx';

const STATUSES: DeliveryStatusTone[] = ['requested', 'searching', 'in-transit', 'delivered', 'incident', 'failed'];

const meta = {
  title: 'Contenido/StatusBadge',
  component: StatusBadge,
  args: { status: 'in-transit' },
  argTypes: { status: { control: 'select', options: STATUSES } },
} satisfies Meta<typeof StatusBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const AllStatuses: Story = {
  render: () => (
    <>
      <Section
        title="Estados de entrega"
        description="Colores aprobados en la identidad. Ícono y texto siempre; el punto pulsante marca estados en vivo y se detiene con movimiento reducido."
      >
        <Row>{STATUSES.map((status) => <StatusBadge key={status} status={status} />)}</Row>
      </Section>
      <Section title="Compacto y etiqueta personalizada">
        <Row>
          {STATUSES.map((status) => <StatusBadge key={status} status={status} size="sm" />)}
          <StatusBadge status="incident" label="Negocio cerrado al llegar" />
        </Row>
      </Section>
    </>
  ),
};
