import type { ReactNode } from 'react';

export interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  /** Small label above the title, e.g. the current branch. */
  overline?: ReactNode;
  /** Primary page actions, aligned to the end on wide screens. */
  actions?: ReactNode;
}

/** Page title block: one `h1` per screen, with the main actions beside it. */
export function PageHeader({ title, description, overline, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1.5">
        {overline && <p className="text-xs font-bold uppercase tracking-overline text-text-link">{overline}</p>}
        <h1 className="text-3xl font-extrabold tracking-tight text-text-primary">{title}</h1>
        {description && <p className="max-w-2xl text-md text-text-secondary">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-3">{actions}</div>}
    </header>
  );
}
