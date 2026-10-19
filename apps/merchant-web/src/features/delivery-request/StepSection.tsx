import type { ReactNode } from 'react';

/** One wizard step: a heading that receives focus context and its content. */
export function StepSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section aria-labelledby="step-title" className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 id="step-title" tabIndex={-1} className="text-xl font-bold text-text-primary outline-none">{title}</h2>
        {description && <p className="text-md text-text-secondary">{description}</p>}
      </div>
      {children}
    </section>
  );
}

/** Step buttons: back on the start, the main action on the end; stacked on phones. */
export function StepActions({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col-reverse gap-3 border-t border-border-subtle pt-6 sm:flex-row sm:items-center sm:justify-end">
      {children}
    </div>
  );
}
