import type { Meta, StoryObj } from '@storybook/react-vite';
import { ArrowRight, Package, Plus, Trash2 } from 'lucide-react';
import { Button } from './Button.tsx';
import type { ButtonVariant } from './button-styles.ts';

const meta = {
  title: 'Acciones/Button',
  component: Button,
  args: { children: 'Solicitar envío', variant: 'primary', size: 'md' },
  argTypes: {
    variant: { control: 'inline-radio', options: ['primary', 'accent', 'secondary', 'outline', 'ghost', 'danger'] },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

const VARIANTS: { variant: ButtonVariant; label: string; use: string }[] = [
  { variant: 'primary', label: 'Solicitar envío', use: 'Acción principal de la vista; una por bloque.' },
  { variant: 'accent', label: 'Pídelo de Volon', use: 'Momento de marca: invitación o CTA destacado. Escaso.' },
  { variant: 'secondary', label: 'Ver detalles', use: 'Acción alternativa con presencia.' },
  { variant: 'outline', label: 'Editar sucursal', use: 'Acción neutra junto a la principal.' },
  { variant: 'ghost', label: 'Cancelar', use: 'Acción terciaria, barras de herramientas.' },
  { variant: 'danger', label: 'Eliminar', use: 'Acción destructiva; confirmar antes de ejecutar.' },
];

export const Variants: Story = {
  render: () => (
    <div className="grid max-w-3xl gap-4">
      {VARIANTS.map(({ variant, label, use }) => (
        <div key={variant} className="grid grid-cols-[180px_1fr] items-center gap-6">
          <Button variant={variant}>{label}</Button>
          <p className="text-sm text-text-secondary"><strong className="text-text-primary">{variant}</strong> — {use}</p>
        </div>
      ))}
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button size="sm">Pequeño · 36</Button>
      <Button size="md">Mediano · 44</Button>
      <Button size="lg">Grande · 52</Button>
    </div>
  ),
};

export const WithIcons: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button leadingIcon={<Plus />}>Nuevo envío</Button>
      <Button variant="secondary" trailingIcon={<ArrowRight />}>Continuar</Button>
      <Button variant="outline" leadingIcon={<Package />}>Paquetes</Button>
      <Button variant="danger" leadingIcon={<Trash2 />}>Eliminar</Button>
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <div className="grid gap-4">
      {(['primary', 'accent', 'secondary', 'outline', 'ghost', 'danger'] as const).map((variant) => (
        <div key={variant} className="flex flex-wrap items-center gap-3">
          <Button variant={variant}>Normal</Button>
          <Button variant={variant} isPending>Enviando</Button>
          <Button variant={variant} isDisabled>No disponible</Button>
        </div>
      ))}
    </div>
  ),
};

export const FullWidth: Story = {
  render: () => (
    <div className="max-w-sm">
      <Button fullWidth size="lg" variant="accent" trailingIcon={<ArrowRight />}>Pídelo de Volon</Button>
    </div>
  ),
};
