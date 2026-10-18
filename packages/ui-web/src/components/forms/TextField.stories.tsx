import type { Meta, StoryObj } from '@storybook/react-vite';
import { Mail, MapPin, Phone } from 'lucide-react';
import { Section, Stack } from '../../gallery/Showcase.tsx';
import { TextField } from './TextField.tsx';

const meta = {
  title: 'Formularios/TextField',
  component: TextField,
  args: { label: 'Nombre del comercio', placeholder: 'Ej. Taquería El Muelle', description: 'Así lo verán tus clientes.' },
} satisfies Meta<typeof TextField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const States: Story = {
  render: () => (
    <>
      <Section title="Estados">
        <Stack>
          <TextField label="Normal" placeholder="Escribe aquí" />
          <TextField label="Obligatorio" isRequired description="El asterisco no sustituye la validación." />
          <TextField label="Con error" isInvalid defaultValue="33 1234" errorMessage="Escribe un teléfono de 10 dígitos." leadingIcon={<Phone />} />
          <TextField label="Deshabilitado" isDisabled defaultValue="PV-CENTRO-01" />
          <TextField label="Solo lectura" isReadOnly defaultValue="Zona Centro, Puerto Vallarta" />
        </Stack>
      </Section>
      <Section title="Tamaños e íconos" description="El tamaño md mide 44 px y usa texto de 16 px para que iOS no haga zoom.">
        <Stack>
          <TextField label="Pequeño" size="sm" placeholder="36 px" />
          <TextField label="Correo" type="email" leadingIcon={<Mail />} placeholder="tu@negocio.mx" />
          <TextField label="Grande" size="lg" leadingIcon={<MapPin />} placeholder="Calle, número y colonia" />
        </Stack>
      </Section>
      <Section title="Multilínea">
        <Stack>
          <TextField label="Indicaciones para el repartidor" multiline placeholder="Ej. Tocar el timbre dos veces" description="Máximo 280 caracteres." />
        </Stack>
      </Section>
    </>
  ),
};
