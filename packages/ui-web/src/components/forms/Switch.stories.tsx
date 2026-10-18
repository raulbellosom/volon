import type { Meta, StoryObj } from '@storybook/react-vite';
import { Stack } from '../../gallery/Showcase.tsx';
import { Switch } from './Switch.tsx';

const meta = {
  title: 'Formularios/Switch',
  component: Switch,
  args: { children: 'Aceptar envíos automáticamente' },
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const States: Story = {
  render: () => (
    <Stack>
      <Switch>Apagado</Switch>
      <Switch defaultSelected>Encendido</Switch>
      <Switch isDisabled>Deshabilitado</Switch>
      <Switch isDisabled defaultSelected>Deshabilitado y encendido</Switch>
    </Stack>
  ),
};
