import type { Meta, StoryObj } from '@storybook/react-vite';
import { DialogTrigger } from 'react-aria-components';
import { Button } from '../actions/Button.tsx';
import { Row } from '../../gallery/Showcase.tsx';
import { AlertDialog } from './AlertDialog.tsx';

const meta = {
  title: 'Overlays/AlertDialog',
  component: AlertDialog,
  args: { title: '¿Cancelar el envío?', children: null, confirmLabel: 'Cancelar envío', onConfirm: () => undefined },
} satisfies Meta<typeof AlertDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export const Confirmations: Story = {
  render: () => (
    <Row>
      <DialogTrigger>
        <Button variant="danger">Cancelar envío</Button>
        <AlertDialog title="¿Cancelar el envío PV-1024?" confirmLabel="Cancelar envío" cancelLabel="Mantener envío" tone="danger" onConfirm={() => wait(1200)}>
          El repartidor recibirá un aviso. Esta acción no se puede deshacer.
        </AlertDialog>
      </DialogTrigger>
      <DialogTrigger>
        <Button variant="outline">Publicar horario</Button>
        <AlertDialog title="¿Publicar el nuevo horario?" confirmLabel="Publicar" onConfirm={() => wait(800)}>
          Los clientes verán el horario actualizado de inmediato.
        </AlertDialog>
      </DialogTrigger>
    </Row>
  ),
};
