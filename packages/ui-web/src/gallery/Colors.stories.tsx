import { brandPalette } from '@delivery/branding';
import { colorThemes, contrastRatio, type ColorTokenName } from '@delivery/design-tokens';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Section } from './Showcase.tsx';

const meta = { title: 'Fundamentos/Color' } satisfies Meta;
export default meta;

const GROUPS: { title: string; description: string; match: (name: ColorTokenName) => boolean }[] = [
  { title: 'Superficies', description: 'De abajo hacia arriba: background → surface → raised. En oscuro, subir = aclarar.', match: (n) => n === 'background' || n.startsWith('surface') || n === 'scrim' },
  { title: 'Texto y bordes', description: 'Nunca uses gris claro para texto: los pares están auditados (AA).', match: (n) => n.startsWith('text-') || n.startsWith('border') || n === 'focus-ring' },
  { title: 'Acciones', description: 'Azul eléctrico en claro; lima en oscuro. Accent (lima) es el momento de marca.', match: (n) => n.startsWith('action-') || n === 'accent' },
  { title: 'Retroalimentación', description: 'Cada tono tiene fg (texto/ícono), bg (fondo suave) y border.', match: (n) => n.startsWith('feedback-') },
  { title: 'Estados de entrega', description: 'Compartidos por ambos temas.', match: (n) => n.startsWith('status-') },
];

function Swatch({ name }: { name: ColorTokenName }) {
  const light = colorThemes.light[name];
  const dark = colorThemes.dark[name];
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-border-subtle bg-surface">
      <div className="grid h-16 grid-cols-2">
        <span style={{ background: light }} title={`Claro ${light}`} />
        <span style={{ background: dark }} title={`Oscuro ${dark}`} />
      </div>
      <div className="flex flex-col gap-0.5 p-3">
        <code className="truncate text-sm font-semibold text-text-primary">{name}</code>
        <span className="font-mono text-xs text-text-secondary">{light} · {dark}</span>
      </div>
    </div>
  );
}

export const Brand: StoryObj = {
  render: () => (
    <Section title="Paleta de marca" description="Fuente: packages/branding. El lima nunca va solo sobre blanco (1.18:1).">
      <div className="grid max-w-4xl grid-cols-2 gap-4 md:grid-cols-4">
        {Object.entries(brandPalette).map(([name, hex]) => (
          <div key={name} className="overflow-hidden rounded-xl border border-border-subtle bg-surface">
            <div className="h-24" style={{ background: hex }} />
            <div className="p-3">
              <p className="font-semibold">{name}</p>
              <p className="font-mono text-xs text-text-secondary">{hex} · blanco {contrastRatio('#FFFFFF', hex).toFixed(2)}:1</p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  ),
};

export const SemanticTokens: StoryObj = {
  render: () => (
    <>
      {GROUPS.map((group) => (
        <Section key={group.title} title={group.title} description={`${group.description} Cada muestra: izquierda claro, derecha oscuro.`}>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
            {(Object.keys(colorThemes.light) as ColorTokenName[]).filter(group.match).map((name) => <Swatch key={name} name={name} />)}
          </div>
        </Section>
      ))}
    </>
  ),
};
