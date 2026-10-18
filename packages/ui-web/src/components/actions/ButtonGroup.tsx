import type { ReactNode } from 'react';
import { cx } from '../../utils/cx.ts';

export interface ButtonGroupProps {
  /** Names the group for assistive tech, e.g. «Acciones del envío». */
  'aria-label': string;
  children: ReactNode;
  /**
   * `attached` joins buttons into one pill (related, equal-weight actions).
   * `spaced` keeps separate pills that wrap on narrow screens.
   */
  variant?: 'attached' | 'spaced';
  className?: string;
}

/** Groups related buttons or toggle buttons; each keeps its own focus and keyboard behavior. */
export function ButtonGroup({ children, variant = 'spaced', className, ...props }: ButtonGroupProps) {
  return (
    <div
      role="group"
      aria-label={props['aria-label']}
      className={cx(
        'inline-flex',
        variant === 'attached'
          ? cx(
            '-space-x-px [&>*]:rounded-none [&>*:first-child]:rounded-s-full [&>*:last-child]:rounded-e-full',
            '[&>*]:relative [&>*:focus-visible]:z-10 [&>*[data-focus-visible]]:z-10',
          )
          : 'flex-wrap gap-2',
        className,
      )}
    >
      {children}
    </div>
  );
}
