import { FlaskConical } from 'lucide-react';

/** Always visible in demo mode so synthetic screens are never mistaken for real operation. */
export function DemoBanner() {
  return (
    <div role="note" className="bg-feedback-warning-bg text-feedback-warning-fg">
      <p className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2 text-sm font-semibold sm:px-6">
        <FlaskConical aria-hidden="true" className="size-4 shrink-0" />
        <span>
          Modo demostración: datos sintéticos en este navegador. No se crean envíos reales ni se contacta al servidor.
        </span>
      </p>
    </div>
  );
}
