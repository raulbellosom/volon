import { controlHeight, durations, easings, layers, radius, spacing } from '@delivery/design-tokens';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../components/actions/Button.tsx';
import { Section } from './Showcase.tsx';

const meta = { title: 'Fundamentos/Geometría y movimiento' } satisfies Meta;
export default meta;

export const SpacingAndRadius: StoryObj = {
  render: () => (
    <>
      <Section title="Espaciado" description="Retícula de 4 px; los medios pasos (2 y 6 px) son para ajustes finos de ícono y texto.">
        <div className="flex flex-col gap-2">
          {Object.entries(spacing).map(([step, px]) => (
            <div key={step} className="grid grid-cols-[48px_56px_1fr] items-center gap-3">
              <code className="text-sm font-semibold">{step}</code>
              <span className="font-mono text-xs text-text-secondary">{px}px</span>
              <span className="h-3 rounded-full bg-action-primary" style={{ width: px }} />
            </div>
          ))}
        </div>
      </Section>
      <Section title="Radios" description="Acciones en píldora (como la cinta del logo), controles suaves y contenedores concéntricos.">
        <div className="flex flex-wrap gap-4">
          {Object.entries(radius).map(([name, px]) => (
            <div key={name} className="flex flex-col items-center gap-2">
              <span className="size-20 border-2 border-action-primary bg-surface-selected" style={{ borderRadius: Math.min(px, 40) }} />
              <code className="text-xs">{name} · {px === 9999 ? 'full' : `${px}px`}</code>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Alturas de control" description={`md = ${controlHeight.md}px cumple el objetivo táctil de 44 px.`}>
        <div className="flex flex-wrap items-end gap-3">
          {(['sm', 'md', 'lg'] as const).map((size) => <Button key={size} size={size}>{size} · {controlHeight[size]}</Button>)}
        </div>
      </Section>
    </>
  ),
};

export const ElevationAndMotion: StoryObj = {
  render: () => (
    <>
      <Section title="Elevación" description="Sombras teñidas de azul profundo en claro; en oscuro la profundidad la dan superficies más claras.">
        <div className="flex flex-wrap gap-6">
          {(['shadow-1', 'shadow-2', 'shadow-3'] as const).map((shadow, index) => (
            <div key={shadow} className={`flex size-32 items-center justify-center rounded-xl bg-surface-raised text-sm font-semibold ${shadow}`}>
              Nivel {index + 1}
            </div>
          ))}
        </div>
      </Section>
      <Section title="Movimiento" description="Rápido y directo. Con «reducir movimiento» las animaciones se desactivan globalmente.">
        <div className="grid max-w-xl gap-2 text-sm">
          {Object.entries(durations).map(([name, ms]) => <div key={name} className="flex justify-between"><code>{name}</code><span>{ms} ms</span></div>)}
          {Object.entries(easings).map(([name, curve]) => <div key={name} className="flex justify-between"><code>ease-{name}</code><span className="font-mono text-xs">{curve.join(', ')}</span></div>)}
        </div>
      </Section>
      <Section title="Capas (z-index)">
        <div className="grid max-w-xl gap-2 text-sm">
          {Object.entries(layers).map(([name, value]) => <div key={name} className="flex justify-between"><code>--z-{name}</code><span>{value}</span></div>)}
        </div>
      </Section>
    </>
  ),
};
