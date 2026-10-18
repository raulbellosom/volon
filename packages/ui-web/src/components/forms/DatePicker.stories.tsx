import { isWeekend, parseDate, today, getLocalTimeZone } from '@internationalized/date';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { CalendarClock } from 'lucide-react';
import { Section, Stack } from '../../gallery/Showcase.tsx';
import { DatePicker } from './DatePicker.tsx';

const meta = {
  title: 'Formularios/DatePicker',
  component: DatePicker,
  args: { label: 'Fecha de entrega' },
} satisfies Meta<typeof DatePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const States: Story = {
  render: () => (
    <Section title="Estados" description="Escribe día/mes/año o usa «Elegir». En el calendario: flechas para moverte, Re Pág/Av Pág para cambiar de mes.">
      <Stack>
        <DatePicker label="Fecha de entrega" defaultValue={parseDate('2026-10-18')} isRequired />
        <DatePicker
          label="Programar recogida"
          icon={<CalendarClock />}
          minValue={today(getLocalTimeZone())}
          isDateUnavailable={(date) => isWeekend(date, 'es-MX')}
          description="Solo días hábiles a partir de hoy."
          validationBehavior="aria"
        />
        <DatePicker label="Fecha" value={parseDate('2026-10-01')} minValue={parseDate('2026-10-10')} validationBehavior="aria" errorMessage="Elige una fecha a partir del 10 de octubre." />
        <DatePicker label="Fecha" isDisabled defaultValue={parseDate('2026-10-18')} />
        <DatePicker label="Fecha" isReadOnly defaultValue={parseDate('2026-10-18')} />
      </Stack>
    </Section>
  ),
};
