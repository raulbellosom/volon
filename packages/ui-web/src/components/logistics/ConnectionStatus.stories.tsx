import type { Meta, StoryObj } from '@storybook/react-vite';
import { Row, Section } from '../../gallery/Showcase.tsx';
import { ConnectionStatus } from './ConnectionStatus.tsx';

const meta = {
  title: 'Logística/ConnectionStatus',
  component: ConnectionStatus,
  args: { state: 'live', lastUpdated: 'hace 5 s' },
  argTypes: { state: { control: 'inline-radio', options: ['live', 'stale', 'reconnecting', 'offline'] } },
} satisfies Meta<typeof ConnectionStatus>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const States: Story = {
  render: () => (
    <Section
      title="Frescura del seguimiento"
      description="Una ubicación vieja nunca se presenta como actual. Al reconectar, la app recarga el estado desde la API; el socket no es la fuente de verdad."
    >
      <Row>
        <ConnectionStatus state="live" lastUpdated="hace 5 s" />
        <ConnectionStatus state="stale" lastUpdated="hace 3 min" />
        <ConnectionStatus state="reconnecting" />
        <ConnectionStatus state="offline" lastUpdated="última actualización 14:05" />
      </Row>
    </Section>
  ),
};
