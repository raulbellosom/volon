import type { ReactNode } from 'react';
import { cx } from '../../utils/cx.ts';

export type IconChipTone = 'brand' | 'accent' | 'info' | 'success' | 'warning' | 'danger' | 'neutral';
export type IconChipSize = 'sm' | 'md' | 'lg';

const TONES: Record<IconChipTone, string> = {
  brand: 'bg-surface-selected text-text-on-secondary',
  /** Signature pairing: lime chip with deep blue icon. */
  accent: 'bg-selection-fill text-selection-mark',
  info: 'bg-feedback-info-bg text-feedback-info-fg',
  success: 'bg-feedback-success-bg text-feedback-success-fg',
  warning: 'bg-feedback-warning-bg text-feedback-warning-fg',
  danger: 'bg-feedback-danger-bg text-feedback-danger-fg',
  neutral: 'bg-surface-sunken text-text-secondary',
};

const SIZES: Record<IconChipSize, string> = {
  sm: 'size-8 rounded-sm [&_svg]:size-4',
  md: 'size-10 rounded-md [&_svg]:size-5',
  lg: 'size-12 rounded-lg [&_svg]:size-6',
};

export interface IconChipProps {
  icon: ReactNode;
  tone?: IconChipTone;
  size?: IconChipSize;
  className?: string;
}

/** Decorative tinted square that gives every header, field or list item a visual anchor. */
export function IconChip({ icon, tone = 'brand', size = 'md', className }: IconChipProps) {
  return (
    <span aria-hidden="true" className={cx('inline-flex shrink-0 items-center justify-center', TONES[tone], SIZES[size], className)}>
      {icon}
    </span>
  );
}
