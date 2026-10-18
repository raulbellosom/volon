import type { Meta, StoryObj } from '@storybook/react-vite';
import { Stack } from '../../gallery/Showcase.tsx';
import { PasswordField } from './PasswordField.tsx';

const meta = {
  title: 'Formularios/PasswordField',
  component: PasswordField,
  args: { label: 'Contraseña', isRequired: true },
} satisfies Meta<typeof PasswordField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const States: Story = {
  render: () => (
    <Stack>
      <PasswordField label="Contraseña" description="Mínimo 12 caracteres." autoComplete="new-password" />
      <PasswordField label="Contraseña" isInvalid errorMessage="La contraseña no coincide." defaultValue="secreto" />
      <PasswordField label="Contraseña" isDisabled defaultValue="secreto" />
    </Stack>
  ),
};
