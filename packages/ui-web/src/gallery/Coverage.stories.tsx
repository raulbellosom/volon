import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge, type BadgeTone } from '../components/content/Badge.tsx';
import { coverage, type CoverageStatus } from '../coverage.ts';
import { Section } from './Showcase.tsx';

const meta = { title: 'Cobertura/Matriz' } satisfies Meta;
export default meta;

const STATUS: Record<CoverageStatus, { label: string; tone: BadgeTone }> = {
  pending: { label: 'Pendiente', tone: 'neutral' },
  implemented: { label: 'Implementado', tone: 'warning' },
  tested: { label: 'Probado', tone: 'success' },
  reviewed: { label: 'Revisado', tone: 'brand' },
};

export const Matrix: StoryObj = {
  render: () => {
    const families = [...new Set(coverage.map((entry) => entry.family))];
    const done = coverage.filter((entry) => entry.status !== 'pending').length;
    return (
      <>
        <p className="mb-6 max-w-2xl text-md text-text-secondary">
          <strong className="text-text-primary">{done} de {coverage.length}</strong> componentes con código, historia y pruebas de comportamiento verificadas automáticamente.
          «Revisado» se marca solo cuando el equipo de producto aprueba el componente visualmente.
        </p>
        {families.map((family) => (
          <Section key={family} title={family}>
            <table className="w-full max-w-3xl text-start text-sm">
              <thead className="text-xs uppercase tracking-overline text-text-secondary">
                <tr><th className="py-2 text-start">Componente</th><th className="py-2 text-start">Estado</th><th className="py-2 text-start">Pruebas</th><th className="py-2 text-start">Notas</th></tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {coverage.filter((entry) => entry.family === family).map((entry) => (
                  <tr key={entry.name}>
                    <td className="py-2.5 pe-4 font-semibold">{entry.name}</td>
                    <td className="py-2.5 pe-4"><Badge size="sm" tone={STATUS[entry.status].tone}>{STATUS[entry.status].label}</Badge></td>
                    <td className="py-2.5 pe-4 font-mono text-xs text-text-secondary">{entry.tests?.map((file) => file.split('/').pop()).join(', ')}</td>
                    <td className="py-2.5 text-text-secondary">{entry.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        ))}
      </>
    );
  },
};
