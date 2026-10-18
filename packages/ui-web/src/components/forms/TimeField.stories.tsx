import { parseTime } from '@internationalized/date';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Section, Stack } from '../../gallery/Showcase.tsx';
import { TimeField } from './TimeField.tsx';

const meta = {
  title: 'Formularios/TimeField',
  component: TimeField,
  args: { label: 'Hora de recogida' },
} satisfies Meta<typeof TimeField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const States: Story = {
  render: () => (
    <Section title="Estados" description="↑/↓ cambian el segmento enfocado; los números escritos avanzan solos al siguiente segmento.">
      <Stack>
        <TimeField label="Hora de recogida" defaultValue={parseTime('14:05')} />
        <TimeField label="Hora (24 h)" hourCycle={24} defaultValue={parseTime('18:30')} />
        <TimeField label="Desde" minValue={parseTime('12:00')} maxValue={parseTime('20:00')} value={parseTime('21:00')} validationBehavior="aria" errorMessage="El servicio opera de 12:00 a 20:00." />
        <TimeField label="Hora" isDisabled defaultValue={parseTime('14:05')} />
      </Stack>
    </Section>
  ),
};
