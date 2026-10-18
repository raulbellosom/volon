import type { ReactNode } from 'react';
import { Label, ProgressBar, type ProgressBarProps } from 'react-aria-components';
import { cx } from '../../utils/cx.ts';

export type ProgressTone = 'brand' | 'success' | 'warning' | 'danger';

const FILL: Record<ProgressTone, string> = {
  brand: 'bg-selection-fill',
  success: 'bg-status-delivered-bg',
  warning: 'bg-status-incident-bg',
  danger: 'bg-status-failed-bg',
};

export interface ProgressProps extends Omit<ProgressBarProps, 'children' | 'className'> {
  label?: ReactNode;
  /** Hide the percentage text (it is still announced). */
  hideValue?: boolean;
  tone?: ProgressTone;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Determinate progress (uploads, onboarding steps, capacity). For unknown durations pass
 * `isIndeterminate`: the fill becomes a moving segment, stopped by reduced motion.
 */
export function Progress({ label, hideValue, tone = 'brand', size = 'md', className, ...props }: ProgressProps) {
  return (
    <ProgressBar {...props} className={cx('flex w-full flex-col gap-1.5', className)}>
      {({ percentage, valueText, isIndeterminate }) => (
        <>
          {(label || !hideValue) && (
            <div className="flex items-center justify-between gap-3 text-sm">
              {label && <Label className="font-semibold text-text-primary">{label}</Label>}
              {!hideValue && !isIndeterminate && <span className="font-bold tabular-nums text-text-primary">{valueText}</span>}
            </div>
          )}
          <div className={cx('relative w-full overflow-hidden rounded-full bg-surface-sunken', size === 'sm' ? 'h-1.5' : 'h-2.5')}>
            <div
              className={cx(
                'absolute inset-y-0 rounded-full transition-[width] duration-(--duration-slow) ease-standard',
                FILL[tone],
                isIndeterminate && 'w-1/3 animate-indeterminate motion-reduce:left-0 motion-reduce:w-full motion-reduce:animate-none motion-reduce:opacity-50',
              )}
              style={isIndeterminate ? undefined : { width: `${percentage ?? 0}%` }}
            />
          </div>
        </>
      )}
    </ProgressBar>
  );
}
