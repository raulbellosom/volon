import type { Meta, StoryObj } from '@storybook/react-vite';
import { MapPinned, Store } from 'lucide-react';
import { Section, Stack } from '../../gallery/Showcase.tsx';
import { ComboBox } from './ComboBox.tsx';
import { Option } from './ListBoxItem.tsx';

/** Synthetic sample of Puerto Vallarta neighborhoods. */
const COLONIAS = ['Centro', 'Emiliano Zapata', 'Versalles', 'El Pitillal', 'Marina Vallarta', 'Fluvial Vallarta', '5 de Diciembre', 'Las Gaviotas', 'Lázaro Cárdenas', 'Bobadilla']
  .map((name) => ({ id: name.toLowerCase().replace(/\s+/g, '-'), name }));

const meta = {
  title: 'Formularios/ComboBox',
  component: ComboBox,
  args: { label: 'Colonia', icon: <MapPinned />, children: null },
} satisfies Meta<typeof ComboBox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  render: () => (
    <>
      <Section title="Buscar mientras escribes" description="Filtra sin distinguir acentos ni mayúsculas. Si nada coincide se muestra «Sin resultados».">
        <Stack>
          <ComboBox label="Colonia de entrega" icon={<MapPinned />} defaultItems={COLONIAS} placeholder="Escribe para buscar" isRequired>
            {(colonia) => <Option id={colonia.id}>{colonia.name}</Option>}
          </ComboBox>
        </Stack>
      </Section>
      <Section title="Estados">
        <Stack>
          <ComboBox label="Sucursal" icon={<Store />} defaultItems={COLONIAS} defaultSelectedKey="centro" description="Abre también al enfocar." menuTrigger="focus">
            {(colonia) => <Option id={colonia.id}>{colonia.name}</Option>}
          </ComboBox>
          <ComboBox label="Colonia" icon={<MapPinned />} defaultItems={COLONIAS} isInvalid errorMessage="Esta colonia está fuera de la zona piloto.">
            {(colonia) => <Option id={colonia.id}>{colonia.name}</Option>}
          </ComboBox>
          <ComboBox label="Colonia" icon={<MapPinned />} defaultItems={COLONIAS} isDisabled defaultSelectedKey="versalles">
            {(colonia) => <Option id={colonia.id}>{colonia.name}</Option>}
          </ComboBox>
        </Stack>
      </Section>
    </>
  ),
};
