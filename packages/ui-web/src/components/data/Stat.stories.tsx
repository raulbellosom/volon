import type { Meta, StoryObj } from '@storybook/react-vite';
import { CircleCheck, Clock, Timer, TriangleAlert, Truck } from 'lucide-react';
import { Card, CardContent } from '../content/Card.tsx';
import { Stat } from './Stat.tsx';

const meta = {
  title: 'Datos/Stat',
  component: Stat,
  args: { label: 'Entregas hoy', value: '128' },
} satisfies Meta<typeof Stat>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** Synthetic figures. */
export const Grid: Story = {
  render: () => (
    <div className="grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card><CardContent className="py-5"><Stat icon={<Truck />} label="Entregas hoy" value="128" delta={{ value: '+12%', direction: 'up', sentiment: 'positive', period: 'vs. ayer' }} /></CardContent></Card>
      <Card><CardContent className="py-5"><Stat icon={<Timer />} label="Tiempo promedio" value="27 min" delta={{ value: '−3 min', direction: 'down', sentiment: 'positive', period: 'vs. semana pasada' }} /></CardContent></Card>
      <Card><CardContent className="py-5"><Stat icon={<TriangleAlert />} iconTone="warning" label="Incidencias" value="4" delta={{ value: '+2', direction: 'up', sentiment: 'negative' }} /></CardContent></Card>
      <Card><CardContent className="py-5"><Stat icon={<CircleCheck />} iconTone="success" label="A tiempo" value="98%" delta={{ value: '0%', direction: 'flat', sentiment: 'neutral' }} hint="Meta 95%" /></CardContent></Card>
      <Card className="sm:col-span-2"><CardContent className="py-5"><Stat icon={<Clock />} label="Ventana de servicio con un nombre largo que se ajusta" value="12:00 – 20:00" /></CardContent></Card>
    </div>
  ),
};
