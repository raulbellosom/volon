import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../actions/Button.tsx';
import { Stack } from '../../gallery/Showcase.tsx';
import { Alert } from './Alert.tsx';

const meta = {
  title: 'Retroalimentación/Alert',
  component: Alert,
  args: { tone: 'info', title: 'Tu zona está en piloto', children: 'Algunas colonias aún no tienen cobertura.' },
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Tones: Story = {
  render: () => (
    <Stack width="max-w-xl">
      <Alert tone="info" title="Horario de servicio">Recibimos solicitudes de 12:00 a 20:00.</Alert>
      <Alert tone="success" title="Sucursal verificada" onDismiss={() => undefined}>Ya puedes solicitar envíos.</Alert>
      <Alert tone="warning" title="Alta demanda">La asignación puede tardar más de lo habitual.</Alert>
      <Alert
        tone="danger"
        title="No pudimos confirmar el pago"
        actions={<><Button size="sm" variant="outline">Reintentar</Button><Button size="sm" variant="ghost">Contactar soporte</Button></>}
      >
        El envío no se despacha hasta confirmar el cobro.
      </Alert>
    </Stack>
  ),
};
