import type { ReactNode } from 'react';
import { cx } from '../../utils/cx.ts';
import { IconChip, type IconChipTone } from '../content/IconChip.tsx';

export interface EmptyStateProps {
  icon: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Next step: usually one primary action and optionally a secondary one. */
  actions?: ReactNode;
  /** `danger` for errors (ErrorState), `brand` for first-use empty states. */
  tone?: IconChipTone;
  /** Smaller padding for tables and cards. */
  compact?: boolean;
  className?: string;
}

/** Explains why there is nothing to show and what to do next. Also used for load errors. */
export function EmptyState({ icon, title, description, actions, tone = 'brand', compact, className }: EmptyStateProps) {
  return (
    <div className={cx('flex flex-col items-center gap-3 text-center', compact ? 'px-4 py-8' : 'px-6 py-14', className)}>
      <IconChip icon={icon} tone={tone} size="lg" className="mb-1" />
      <p className="text-lg font-bold text-text-primary">{title}</p>
      {description && <p className="max-w-sm text-sm text-text-secondary">{description}</p>}
      {actions && <div className="mt-2 flex flex-wrap justify-center gap-3">{actions}</div>}
    </div>
  );
}
