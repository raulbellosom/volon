import { typeScale, typography } from '@delivery/design-tokens';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Section } from './Showcase.tsx';

const meta = { title: 'Fundamentos/Tipografía' } satisfies Meta;
export default meta;

/** Literal class names so Tailwind can detect them (dynamic `text-${step}` would not be generated). */
const SIZE_CLASSES: Record<keyof typeof typeScale, string> = {
  xs: 'text-xs', sm: 'text-sm', md: 'text-md', lg: 'text-lg', xl: 'text-xl',
  '2xl': 'text-2xl', '3xl': 'text-3xl', '4xl': 'text-4xl', '5xl': 'text-5xl',
};

const ROLES = [
  { role: 'Display', className: 'text-5xl font-extrabold', sample: 'Pídelo de Volon' },
  { role: 'Título de página', className: 'text-3xl font-extrabold', sample: 'Envíos de hoy' },
  { role: 'Título de sección', className: 'text-xl font-bold', sample: 'Sucursal Centro' },
  { role: 'Cuerpo', className: 'text-md', sample: 'El repartidor recogerá el paquete en tu sucursal.' },
  { role: 'Etiqueta', className: 'text-sm font-semibold', sample: 'Dirección de entrega' },
  { role: 'Ayuda', className: 'text-sm text-text-secondary', sample: 'Incluye calle, número y colonia.' },
  { role: 'Overline', className: 'text-xs font-bold uppercase tracking-overline text-text-secondary', sample: 'Pídelo de Volon' },
  { role: 'Números', className: 'text-2xl font-extrabold tabular-nums', sample: '$1,258.00 · 14:05 · 3.2 km' },
];

export const Roles: StoryObj = {
  render: () => (
    <Section title="Plus Jakarta Sans" description={`Pesos ${typography.weightRegular}–${typography.weightExtrabold}. Títulos 800 con tracking cerrado; el overline espaciado recuerda el lema del logo.`}>
      <div className="flex flex-col divide-y divide-border-subtle">
        {ROLES.map(({ role, className, sample }) => (
          <div key={role} className="grid gap-2 py-4 md:grid-cols-[180px_1fr] md:items-baseline">
            <span className="text-xs font-semibold text-text-secondary">{role}</span>
            <span className={className}>{sample}</span>
          </div>
        ))}
      </div>
    </Section>
  ),
};

export const Scale: StoryObj = {
  render: () => (
    <Section title="Escala" description="Todas las alturas de línea caen en la retícula de 4 px.">
      <div className="flex flex-col gap-3">
        {Object.entries(typeScale).map(([step, value]) => (
          <div key={step} className="grid grid-cols-[64px_150px_1fr] items-baseline gap-4">
            <code className="text-sm font-semibold">{step}</code>
            <span className="font-mono text-xs text-text-secondary">{value.size}/{value.lineHeight} · {value.tracking}em</span>
            <span className={`${SIZE_CLASSES[step as keyof typeof typeScale]} font-semibold`}>Entrega local rápida</span>
          </div>
        ))}
      </div>
    </Section>
  ),
};
