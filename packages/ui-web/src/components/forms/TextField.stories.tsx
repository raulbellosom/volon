import type { Meta, StoryObj } from '@storybook/react-vite';
import { Building2, Hash, Mail, MapPin, MessageSquareText, Phone, Store } from 'lucide-react';
import { Section, Stack } from '../../gallery/Showcase.tsx';
import { TextField } from './TextField.tsx';

const meta = {
  title: 'Formularios/TextField',
  component: TextField,
  args: {
    label: 'Nombre del comercio',
    placeholder: 'Ej. Taquería El Muelle',
    description: 'Así lo verán tus clientes.',
    icon: <Store />,
  },
} satisfies Meta<typeof TextField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const States: Story = {
  args: { icon: <Store /> },
  render: () => (
    <>
      <Section title="Estados" description="El ícono es obligatorio: indica de un vistazo qué se está llenando. Al enfocar, su ficha se ilumina con el color de acción.">
        <Stack>
          <TextField label="Normal" icon={<Building2 />} placeholder="Escribe aquí" />
          <TextField label="Obligatorio" icon={<Mail />} isRequired description="El asterisco no sustituye la validación." />
          <TextField label="Con error" icon={<Phone />} isInvalid defaultValue="33 1234" errorMessage="Escribe un teléfono de 10 dígitos." />
          <TextField label="Deshabilitado" icon={<Hash />} isDisabled defaultValue="PV-CENTRO-01" />
          <TextField label="Solo lectura" icon={<MapPin />} isReadOnly defaultValue="Zona Centro, Puerto Vallarta" />
        </Stack>
      </Section>
      <Section title="Tamaños" description="md mide 44 px y usa texto de 16 px para que iOS no haga zoom al enfocar.">
        <Stack>
          <TextField label="Pequeño · 36" size="sm" icon={<Hash />} placeholder="Folio" />
          <TextField label="Mediano · 44" icon={<Mail />} type="email" placeholder="tu@negocio.mx" />
          <TextField label="Grande · 52" size="lg" icon={<MapPin />} placeholder="Calle, número y colonia" />
        </Stack>
      </Section>
      <Section title="Multilínea y contenido final">
        <Stack>
          <TextField label="Indicaciones para el repartidor" icon={<MessageSquareText />} multiline placeholder="Ej. Tocar el timbre dos veces" description="Máximo 280 caracteres." />
          <TextField label="Peso aproximado" icon={<Hash />} inputMode="decimal" placeholder="0.0" trailing={<span className="text-sm font-semibold">kg</span>} />
        </Stack>
      </Section>
    </>
  ),
};
