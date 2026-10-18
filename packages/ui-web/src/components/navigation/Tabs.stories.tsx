import type { Meta, StoryObj } from '@storybook/react-vite';
import { CircleCheck, Clock, Truck, TriangleAlert } from 'lucide-react';
import { EmptyState } from '../feedback/EmptyState.tsx';
import { Tab, TabList, TabPanel, Tabs } from './Tabs.tsx';

const meta = {
  title: 'Navegación/Tabs',
  component: Tabs,
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  render: () => (
    <div className="max-w-3xl">
      <Tabs defaultSelectedKey="active">
        <TabList aria-label="Envíos">
          <Tab id="pending" icon={<Clock />} count={2}>Pendientes</Tab>
          <Tab id="active" icon={<Truck />} count={5}>En camino</Tab>
          <Tab id="done" icon={<CircleCheck />}>Entregados</Tab>
          <Tab id="incidents" icon={<TriangleAlert />} count={1}>Incidencias</Tab>
          <Tab id="archived" isDisabled>Archivados</Tab>
        </TabList>
        {['pending', 'active', 'done', 'incidents', 'archived'].map((id) => (
          <TabPanel key={id} id={id}>
            <EmptyState compact icon={<Truck />} title={`Vista «${id}»`} description="La barra de la pestaña activa se desliza; en teléfono la lista se desplaza horizontalmente." />
          </TabPanel>
        ))}
      </Tabs>
    </div>
  ),
};
