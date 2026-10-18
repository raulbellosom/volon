import type { Meta, StoryObj } from '@storybook/react-vite';
import { Copy, Info, Printer, Trash2 } from 'lucide-react';
import { Button } from '../actions/Button.tsx';
import { IconButton } from '../actions/IconButton.tsx';
import { Row, Section } from '../../gallery/Showcase.tsx';
import { Tooltip } from './Tooltip.tsx';

const meta = {
  title: 'Overlays/Tooltip',
  component: Tooltip,
  args: { content: 'Duplicar envío', children: <IconButton label="Duplicar" icon={<Copy />} /> },
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Overview: Story = {
  render: () => (
    <Section title="Tooltips" description="Aparecen al pasar el cursor (medio segundo) o al enfocar con Tab; Escape los cierra. En pantallas táctiles no se muestran: el control conserva su nombre accesible.">
      <Row>
        <Tooltip content="Duplicar envío"><IconButton label="Duplicar" icon={<Copy />} variant="outline" /></Tooltip>
        <Tooltip content="Imprimir guía" placement="bottom"><IconButton label="Imprimir" icon={<Printer />} variant="outline" /></Tooltip>
        <Tooltip content="Se cancela y se avisa al repartidor"><IconButton label="Cancelar envío" icon={<Trash2 />} variant="danger" /></Tooltip>
        <Tooltip content="La tarifa se calcula con la ruta real, no en línea recta." placement="end">
          <Button variant="ghost" leadingIcon={<Info />}>¿Cómo se calcula?</Button>
        </Tooltip>
      </Row>
    </Section>
  ),
};
