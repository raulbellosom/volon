import { isWeekend, parseDate } from '@internationalized/date';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card, CardContent } from '../content/Card.tsx';
import { Calendar } from './Calendar.tsx';

const meta = {
  title: 'Formularios/Calendar',
  component: Calendar,
  args: { 'aria-label': 'Calendario' },
} satisfies Meta<typeof Calendar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  render: () => (
    <Card className="w-fit">
      <CardContent>
        <Calendar
          aria-label="Días de servicio"
          defaultValue={parseDate('2026-10-20')}
          minValue={parseDate('2026-10-05')}
          isDateUnavailable={(date) => isWeekend(date, 'es-MX')}
        />
      </CardContent>
    </Card>
  ),
};
