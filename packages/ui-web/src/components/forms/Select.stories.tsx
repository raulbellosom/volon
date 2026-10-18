import type { Meta, StoryObj } from '@storybook/react-vite';
import { Banknote, Clock, MapPinned, Store } from 'lucide-react';
import { Section, Stack } from '../../gallery/Showcase.tsx';
import { Option } from './ListBoxItem.tsx';
import { Select } from './Select.tsx';

const BRANCHES = [
  { id: 'centro', name: 'Sucursal Centro', address: 'Juárez 120, Centro' },
  { id: 'marina', name: 'Sucursal Marina', address: 'Paseo de la Marina 245' },
  { id: 'versalles', name: 'Sucursal Versalles', address: 'Francisco Villa 880' },
];

const meta = {
  title: 'Formularios/Select',
  component: Select,
  args: { label: 'Sucursal de recogida', icon: <Store />, children: null },
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  render: () => (
    <>
      <Section title="Con descripción por opción" description="El campo muestra solo el texto elegido; la dirección y el check viven en la lista. Datos sintéticos.">
        <Stack>
          <Select label="Sucursal de recogida" icon={<Store />} items={BRANCHES} isRequired>
            {(branch) => <Option id={branch.id} description={branch.address} icon={<Store />}>{branch.name}</Option>}
          </Select>
        </Stack>
      </Section>
      <Section title="Estados">
        <Stack>
          <Select label="Horario" icon={<Clock />} defaultSelectedKey="noon">
            <Option id="noon">12:00 – 16:00</Option>
            <Option id="afternoon">16:00 – 20:00</Option>
            <Option id="night" isDisabled>20:00 – 23:00 (no disponible)</Option>
          </Select>
          <Select label="Zona" icon={<MapPinned />} isInvalid errorMessage="Selecciona una zona con cobertura.">
            <Option id="a">Centro</Option>
          </Select>
          <Select label="Moneda" icon={<Banknote />} isDisabled defaultSelectedKey="mxn">
            <Option id="mxn">Peso mexicano (MXN)</Option>
          </Select>
        </Stack>
      </Section>
    </>
  ),
};
