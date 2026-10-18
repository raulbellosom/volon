import type { Meta, StoryObj } from '@storybook/react-vite';
import { Copy, MoreHorizontal, Pencil, Printer, Share2, Trash2 } from 'lucide-react';
import { Button } from '../actions/Button.tsx';
import { IconButton } from '../actions/IconButton.tsx';
import { Row } from '../../gallery/Showcase.tsx';
import { Menu, MenuItem, MenuSection, MenuSeparator, MenuTrigger } from './Menu.tsx';

const meta = {
  title: 'Navegación/Menu',
  component: Menu,
} satisfies Meta<typeof Menu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  render: () => (
    <Row>
      <MenuTrigger>
        <IconButton label="Acciones del envío" icon={<MoreHorizontal />} variant="outline" />
        <Menu>
          <MenuSection title="Envío PV-1024">
            <MenuItem id="edit" icon={<Pencil />} shortcut="E">Editar</MenuItem>
            <MenuItem id="copy" icon={<Copy />} description="Crea un borrador con los mismos datos">Duplicar</MenuItem>
            <MenuItem id="print" icon={<Printer />}>Imprimir guía</MenuItem>
            <MenuItem id="share" icon={<Share2 />} isDisabled>Compartir seguimiento</MenuItem>
          </MenuSection>
          <MenuSeparator />
          <MenuItem id="delete" icon={<Trash2 />} tone="danger">Cancelar envío</MenuItem>
        </Menu>
      </MenuTrigger>
      <MenuTrigger>
        <Button variant="secondary">Exportar</Button>
        <Menu placement="bottom start">
          <MenuItem id="csv">CSV</MenuItem>
          <MenuItem id="pdf">PDF</MenuItem>
        </Menu>
      </MenuTrigger>
    </Row>
  ),
};
