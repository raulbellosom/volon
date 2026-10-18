import type { ReactNode } from 'react';
import { cx } from '../../utils/cx.ts';

export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'brand' | 'accent';
export type BadgeSize = 'sm' | 'md';

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-surface-sunken text-text-secondary',
  info: 'bg-feedback-info-bg text-feedback-info-fg',
  success: 'bg-feedback-success-bg text-feedback-success-fg',
  warning: 'bg-feedback-warning-bg text-feedback-warning-fg',
  danger: 'bg-feedback-danger-bg text-feedback-danger-fg',
  /** Deep blue with lime: the signature Volon pairing. */
  brand: 'bg-status-in-transit-bg text-status-in-transit-fg ring-1 ring-inset ring-status-in-transit-fg/35',
  accent: 'bg-action-accent text-text-on-accent',
};

const SIZES: Record<BadgeSize, string> = {
  sm: 'h-5 gap-1 px-2 text-xs [&_svg]:size-3',
  md: 'h-6.5 gap-1.5 px-2.5 text-sm [&_svg]:size-3.5',
};

export interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  size?: BadgeSize;
  icon?: ReactNode;
  className?: string;
}

/** Short non-interactive label for a category, count or attribute. */
export function Badge({ children, tone = 'neutral', size = 'md', icon, className }: BadgeProps) {
  return (
    <span
      className={cx(
        'inline-flex w-fit shrink-0 items-center whitespace-nowrap rounded-full font-semibold',
        TONES[tone],
        SIZES[size],
        className,
      )}
    >
      {icon && <span aria-hidden="true" className="flex">{icon}</span>}
      {children}
    </span>
  );
}
