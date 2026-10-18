import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../actions/Button.tsx';
import { Option } from '../forms/ListBoxItem.tsx';
import { Select } from '../forms/Select.tsx';
import { TextField } from '../forms/TextField.tsx';
import { Row } from '../../gallery/Showcase.tsx';
import { Dialog, DialogTrigger, type DialogSize } from './Dialog.tsx';

const meta = {
  title: 'Overlays/Dialog',
  component: Dialog,
  args: { title: 'Editar sucursal', children: null },
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

function FormDialog({ size }: { size: DialogSize }) {
  return (
    <DialogTrigger>
      <Button variant={size === 'md' ? 'primary' : 'outline'}>Abrir {size}</Button>
      <Dialog
        size={size}
        title="Editar sucursal"
        description="Los cambios aplican a nuevas solicitudes."
        footer={(close) => (
          <>
            <Button variant="ghost" onPress={close}>Cancelar</Button>
            <Button onPress={close}>Guardar cambios</Button>
          </>
        )}
      >
        <div className="flex flex-col gap-5">
          <TextField label="Nombre" defaultValue="Sucursal Centro" isRequired />
          <Select label="Horario" defaultSelectedKey="noon">
            <Option id="noon">12:00 – 20:00</Option>
            <Option id="late">14:00 – 22:00</Option>
          </Select>
          <TextField label="Notas para repartidores" multiline />
        </div>
      </Dialog>
    </DialogTrigger>
  );
}

export const Sizes: Story = {
  render: () => (
    <Row>
      <FormDialog size="sm" />
      <FormDialog size="md" />
      <FormDialog size="lg" />
    </Row>
  ),
};

export const OpenByDefault: Story = {
  render: () => (
    <Dialog isOpen title="Sesión por expirar" description="Por seguridad cerraremos tu sesión en 2 minutos." footer={(close) => <Button onPress={close}>Seguir conectado</Button>}>
      <p className="text-text-secondary">Guarda tus cambios antes de continuar.</p>
    </Dialog>
  ),
};
