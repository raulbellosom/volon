import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Section, Stack } from '../../gallery/Showcase.tsx';
import { OTPField } from './OTPField.tsx';

const meta = {
  title: 'Formularios/OTPField',
  component: OTPField,
  args: { label: 'Código de verificación', description: 'Te lo enviamos por SMS al 33 •••• 5678.' },
} satisfies Meta<typeof OTPField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

function WithCompletion() {
  const [status, setStatus] = useState('Escribe o pega el código.');
  return (
    <Stack>
      <OTPField label="Código de 6 dígitos" onComplete={(code) => setStatus(`Código completo: ${code} (ejemplo; aquí no se verifica)`)} />
      <p role="status" className="text-sm text-text-secondary">{status}</p>
    </Stack>
  );
}

export const States: Story = {
  render: () => (
    <>
      <Section title="Completar y pegar" description="Un solo campo real: funciona pegar, el autocompletado de SMS y los lectores de pantalla.">
        <WithCompletion />
      </Section>
      <Section title="Estados">
        <Stack>
          <OTPField label="Código" length={4} defaultValue="12" />
          <OTPField label="Código" isInvalid defaultValue="482913" errorMessage="El código no coincide. Solicita uno nuevo." />
          <OTPField label="Código" isDisabled defaultValue="4829" length={4} />
        </Stack>
      </Section>
    </>
  ),
};
