import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../actions/Button.tsx';
import { Section, Stack } from '../../gallery/Showcase.tsx';
import { Divider } from './Divider.tsx';

const meta = {
  title: 'Contenido/Divider',
  component: Divider,
} satisfies Meta<typeof Divider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  render: () => (
    <>
      <Section title="Horizontal y con texto">
        <Stack>
          <p className="text-sm text-text-secondary">Datos de la sucursal</p>
          <Divider />
          <p className="text-sm text-text-secondary">Datos de facturación</p>
          <Button fullWidth>Continuar con correo</Button>
          <Divider label="o" />
          <Button fullWidth variant="outline">Continuar con teléfono</Button>
        </Stack>
      </Section>
      <Section title="Vertical">
        <div className="flex h-8 items-center gap-4 text-sm">
          <span>Hoy</span><Divider orientation="vertical" /><span>12 envíos</span><Divider orientation="vertical" /><span>3 en camino</span>
        </div>
      </Section>
    </>
  ),
};
