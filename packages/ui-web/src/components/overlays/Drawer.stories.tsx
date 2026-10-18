import type { Meta, StoryObj } from '@storybook/react-vite';
import { Clock, Filter, MapPinned, PanelBottom, PanelLeft } from 'lucide-react';
import { DialogTrigger } from 'react-aria-components';
import { Button } from '../actions/Button.tsx';
import { Checkbox, CheckboxGroup } from '../forms/Checkbox.tsx';
import { Option } from '../forms/ListBoxItem.tsx';
import { Select } from '../forms/Select.tsx';
import { Row } from '../../gallery/Showcase.tsx';
import { Drawer } from './Drawer.tsx';

const meta = {
  title: 'Overlays/Drawer',
  component: Drawer,
  args: { title: 'Filtros', children: null },
} satisfies Meta<typeof Drawer>;

export default meta;
type Story = StoryObj<typeof meta>;

function Filters() {
  return (
    <div className="flex flex-col gap-5">
      <Select label="Zona" icon={<MapPinned />} defaultSelectedKey="all">
        <Option id="all">Todas</Option>
        <Option id="centro">Centro</Option>
      </Select>
      <Select label="Periodo" icon={<Clock />} defaultSelectedKey="today">
        <Option id="today">Hoy</Option>
        <Option id="week">Esta semana</Option>
      </Select>
      <CheckboxGroup label="Estado" defaultValue={['in-transit']}>
        <Checkbox value="requested">Solicitada</Checkbox>
        <Checkbox value="in-transit">En camino</Checkbox>
        <Checkbox value="delivered">Entregada</Checkbox>
      </CheckboxGroup>
    </div>
  );
}

const footer = (close: () => void) => (
  <>
    <Button variant="ghost" onPress={close}>Limpiar</Button>
    <Button onPress={close}>Aplicar filtros</Button>
  </>
);

export const Sides: Story = {
  render: () => (
    <Row>
      <DialogTrigger>
        <Button variant="outline" leadingIcon={<Filter />}>Lateral derecho</Button>
        <Drawer side="end" title="Filtros" description="Detalles y filtros sin perder el contexto." footer={footer}><Filters /></Drawer>
      </DialogTrigger>
      <DialogTrigger>
        <Button variant="outline" leadingIcon={<PanelLeft />}>Lateral izquierdo</Button>
        <Drawer side="start" title="Navegación">Menú principal en teléfono (lo usa Navbar).</Drawer>
      </DialogTrigger>
      <DialogTrigger>
        <Button variant="outline" leadingIcon={<PanelBottom />}>Hoja inferior</Button>
        <Drawer side="bottom" title="Filtros" footer={footer}><Filters /></Drawer>
      </DialogTrigger>
    </Row>
  ),
};
