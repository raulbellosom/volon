import type { Meta, StoryObj } from '@storybook/react-vite';
import { ArrowRight, MoreHorizontal, Store, Zap } from 'lucide-react';
import { Button } from '../actions/Button.tsx';
import { IconButton } from '../actions/IconButton.tsx';
import { Badge } from './Badge.tsx';
import { Card, CardContent, CardFooter, CardHeader } from './Card.tsx';

const meta = {
  title: 'Contenido/Card',
  component: Card,
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  render: () => (
    <div className="grid max-w-5xl gap-5 md:grid-cols-3">
      {(['elevated', 'outline', 'sunken'] as const).map((variant) => (
        <Card key={variant} variant={variant}>
          <CardHeader
            icon={<Store />}
            overline="Sucursal"
            title="Centro"
            description="Juárez 120, Puerto Vallarta"
            action={<IconButton label="Más opciones" icon={<MoreHorizontal />} size="sm" />}
          />
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge tone="success">Abierta</Badge>
              <span className="text-sm text-text-secondary">12:00 – 20:00</span>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="ghost" size="sm">Ver envíos</Button>
            <Button size="sm">Solicitar envío</Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  ),
};

export const Brand: Story = {
  render: () => (
    <div className="grid max-w-4xl gap-5 md:grid-cols-2">
      <Card variant="brand">
        <CardHeader icon={<Zap />} overline="Pídelo de Volon" title="Tu primer envío va por nuestra cuenta" description="Variante de marca: degradado azul con texto blanco en ambos temas. Úsala para momentos de marca, no para contenido de trabajo." />
        <CardFooter align="start">
          <Button variant="accent" trailingIcon={<ArrowRight />}>Solicitar envío</Button>
        </CardFooter>
      </Card>
      <Card variant="brand">
        <CardHeader overline="Hoy" title="12 envíos entregados" description="3 en camino · 1 buscando repartidor" action={<Badge tone="accent">En vivo</Badge>} />
        <CardContent><p className="text-5xl font-extrabold tabular-nums">98%</p><p className="text-sm text-text-secondary">entregas a tiempo esta semana</p></CardContent>
      </Card>
    </div>
  ),
};

export const LongContent: Story = {
  render: () => (
    <Card className="max-w-sm">
      <CardHeader
        icon={<Store />}
        title="Comercializadora de productos regionales y artesanales de la Bahía"
        description="Los títulos largos se ajustan en varias líneas sin empujar las acciones fuera de la tarjeta."
        action={<Badge tone="brand">Piloto</Badge>}
      />
      <CardContent>Contenido de ejemplo con datos sintéticos.</CardContent>
    </Card>
  ),
};
