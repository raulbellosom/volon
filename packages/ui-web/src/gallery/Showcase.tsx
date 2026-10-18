import type { ReactNode } from 'react';

/** Gallery-only layout helpers (not exported from the package). */
export function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-b border-border-subtle py-6 first:pt-0 last:border-0">
      <header className="flex flex-col gap-1">
        <h2 className="text-xs font-bold uppercase tracking-overline text-text-secondary">{title}</h2>
        {description && <p className="max-w-2xl text-sm text-text-secondary">{description}</p>}
      </header>
      {children}
    </section>
  );
}

export function Row({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-3">{children}</div>;
}

export function Stack({ children, width = 'max-w-md' }: { children: ReactNode; width?: string }) {
  return <div className={`flex w-full flex-col gap-5 ${width}`}>{children}</div>;
}
