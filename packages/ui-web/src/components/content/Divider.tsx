import type { ReactNode } from 'react';
import { Separator } from 'react-aria-components';
import { cx } from '../../utils/cx.ts';

export interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  /** Centered text such as «o» between alternatives; the lines become decorative. */
  label?: ReactNode;
  className?: string;
}

/** Separates groups of content. Prefer spacing first; use a divider when grouping is ambiguous. */
export function Divider({ orientation = 'horizontal', label, className }: DividerProps) {
  if (label) {
    return (
      <div className={cx('flex items-center gap-3 text-xs font-bold uppercase tracking-overline text-text-secondary', className)}>
        <span aria-hidden="true" className="h-px flex-1 bg-border-subtle" />
        <span>{label}</span>
        <span aria-hidden="true" className="h-px flex-1 bg-border-subtle" />
      </div>
    );
  }
  return (
    <Separator
      orientation={orientation}
      className={cx('shrink-0 border-0 bg-border-subtle', orientation === 'vertical' ? 'w-px self-stretch' : 'h-px w-full', className)}
    />
  );
}
