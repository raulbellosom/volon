import { ProgressBar } from 'react-aria-components';
import { cx } from '../../utils/cx.ts';

export type SpinnerSize = 'sm' | 'md' | 'lg';

const SIZE_CLASSES: Record<SpinnerSize, string> = { sm: 'size-4', md: 'size-5', lg: 'size-8' };

/** Decorative spinning arc with round caps (like the logo ribbon). Hidden from assistive tech. */
export function SpinnerIcon({ size = 'md', className }: { size?: SpinnerSize; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={cx('animate-spin', SIZE_CLASSES[size], className)}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.22" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export interface SpinnerProps {
  /** Announced to screen readers. */
  label?: string;
  size?: SpinnerSize;
  className?: string;
}

/** Standalone indeterminate progress indicator with an accessible name. */
export function Spinner({ label = 'Cargando', size = 'md', className }: SpinnerProps) {
  return (
    <ProgressBar isIndeterminate aria-label={label} className={cx('inline-flex text-text-link', className)}>
      <SpinnerIcon size={size} />
    </ProgressBar>
  );
}
