import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../actions/Button.tsx';
import { Row } from '../../gallery/Showcase.tsx';
import { ToastRegion, toast } from './Toast.tsx';

const meta = {
  title: 'Overlays/Toast',
  component: ToastRegion,
} satisfies Meta<typeof ToastRegion>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Tones: Story = {
  render: () => (
    <>
      <ToastRegion />
      <p className="mb-4 max-w-xl text-sm text-text-secondary">
        Los avisos de éxito se cierran solos en 5 s (se pausan al pasar el cursor o enfocar). Los errores permanecen hasta cerrarlos.
        F6 lleva el foco a la región de notificaciones.
      </p>
      <Row>
        <Button variant="outline" onPress={() => toast({ title: 'Envío creado', description: 'Folio PV-1024', tone: 'success' })}>Éxito</Button>
        <Button variant="outline" onPress={() => toast({ title: 'Cotización actualizada', tone: 'info' })}>Info</Button>
        <Button variant="outline" onPress={() => toast({ title: 'Conexión inestable', description: 'Reintentando…', tone: 'warning' })}>Advertencia</Button>
        <Button variant="outline" onPress={() => toast({ title: 'No se pudo guardar', description: 'Revisa tu conexión e intenta de nuevo.', tone: 'danger' })}>Error</Button>
      </Row>
    </>
  ),
};
