import { ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { cx } from '../../utils/cx.ts';

export interface ShowroomSectionProps {
  id: string;
  overline: string;
  title: string;
  description: string;
  children: ReactNode;
}

/** One family of components on the collection page. */
export function ShowroomSection({ id, overline, title, description, children }: ShowroomSectionProps) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24 border-t border-border-subtle py-12 first:border-0 first:pt-0">
      <header className="mb-8 flex max-w-2xl flex-col gap-2">
        <p className="text-xs font-bold uppercase tracking-overline text-text-link">{overline}</p>
        <h2 id={`${id}-title`} className="text-3xl font-extrabold tracking-tight">{title}</h2>
        <p className="text-md text-text-secondary">{description}</p>
      </header>
      <div className="flex flex-col gap-6">{children}</div>
    </section>
  );
}

export interface SpecimenProps {
  title: string;
  /** Storybook story id for the «Ver detalle» link. */
  storyId?: string;
  note?: string;
  children: ReactNode;
  className?: string;
}

/** Framed live example with a caption and a link to the full story. */
export function Specimen({ title, storyId, note, children, className }: SpecimenProps) {
  return (
    <figure className={cx('flex flex-col overflow-hidden rounded-xl border border-border-subtle bg-surface', className)}>
      <div className="flex flex-1 flex-col gap-4 p-5 sm:p-6">{children}</div>
      <figcaption className="flex items-center justify-between gap-3 border-t border-border-subtle bg-surface-sunken px-5 py-3">
        <span className="flex flex-col">
          <span className="text-sm font-semibold">{title}</span>
          {note && <span className="text-xs text-text-secondary">{note}</span>}
        </span>
        {storyId && (
          <a
            href={`/?path=/story/${storyId}`}
            target="_top"
            className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-text-link outline-none hover:underline focus-visible:focus-ring"
          >
            Ver detalle <ArrowUpRight aria-hidden="true" className="size-3.5" />
          </a>
        )}
      </figcaption>
    </figure>
  );
}

/** Responsive grid of specimens. */
export function SpecimenGrid({ children, columns = 2 }: { children: ReactNode; columns?: 2 | 3 }) {
  return <div className={cx('grid gap-6', columns === 3 ? 'md:grid-cols-2 xl:grid-cols-3' : 'lg:grid-cols-2')}>{children}</div>;
}

export const SECTIONS = [
  { id: 'fundamentos', label: 'Fundamentos' },
  { id: 'acciones', label: 'Acciones' },
  { id: 'formularios', label: 'Formularios' },
  { id: 'contenido', label: 'Contenido' },
  { id: 'datos', label: 'Datos' },
  { id: 'navegacion', label: 'Navegación' },
  { id: 'retroalimentacion', label: 'Retroalimentación' },
  { id: 'overlays', label: 'Overlays' },
] as const;
