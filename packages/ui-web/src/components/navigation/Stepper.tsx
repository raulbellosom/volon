import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { cx } from '../../utils/cx.ts';

export interface Step {
  id: string;
  label: string;
  description?: ReactNode;
}

export type StepState = 'complete' | 'current' | 'upcoming';

export interface StepperProps {
  steps: readonly Step[];
  /** 0-based index of the step in progress; previous steps are complete. */
  currentIndex: number;
  orientation?: 'horizontal' | 'vertical';
  /** Names the process, e.g. «Alta de sucursal». */
  'aria-label': string;
  className?: string;
}

const STATE_TEXT: Record<StepState, string> = { complete: 'completado', current: 'paso actual', upcoming: 'pendiente' };

const MARKER: Record<StepState, string> = {
  complete: 'bg-selection-fill text-selection-mark',
  current: 'bg-surface text-text-primary ring-[3px] ring-inset ring-action-primary',
  upcoming: 'bg-surface-sunken text-text-secondary',
};

export function stepState(index: number, currentIndex: number): StepState {
  return index < currentIndex ? 'complete' : index === currentIndex ? 'current' : 'upcoming';
}

/**
 * Progress through a multi-step flow (onboarding, delivery request). Not interactive by
 * itself; pair with Back/Continue buttons. Horizontal steppers show only the current
 * label on phones.
 */
export function Stepper({ steps, currentIndex, orientation = 'horizontal', className, ...props }: StepperProps) {
  const vertical = orientation === 'vertical';
  return (
    <nav aria-label={props['aria-label']} className={className}>
      {!vertical && (
        <p className="mb-3 text-sm font-semibold text-text-secondary sm:hidden">
          Paso {Math.min(currentIndex + 1, steps.length)} de {steps.length}: <span className="text-text-primary">{steps[currentIndex]?.label}</span>
        </p>
      )}
      <ol className={cx('flex', vertical ? 'flex-col gap-0' : 'items-start gap-2')}>
        {steps.map((step, index) => {
          const state = stepState(index, currentIndex);
          const last = index === steps.length - 1;
          return (
            <li
              key={step.id}
              {...(state === 'current' ? { 'aria-current': 'step' as const } : {})}
              className={cx('flex', vertical ? 'gap-3' : 'flex-1 flex-col gap-2', !vertical && !last && 'min-w-0')}
            >
              <div className={cx('flex items-center', vertical ? 'flex-col self-stretch' : 'gap-2')}>
                <span className={cx('flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums', MARKER[state])}>
                  {state === 'complete' ? <Check aria-hidden="true" className="size-4" strokeWidth={3} /> : index + 1}
                </span>
                {!last && (
                  <span
                    aria-hidden="true"
                    className={cx(
                      'rounded-full',
                      vertical ? 'my-1 min-h-6 w-0.5 flex-1' : 'h-0.5 flex-1',
                      state === 'complete' ? 'bg-selection-fill' : 'bg-border-subtle',
                    )}
                  />
                )}
              </div>
              <div className={cx('flex min-w-0 flex-col gap-0.5', vertical ? 'pb-6' : 'hidden sm:flex')}>
                <span className={cx('text-sm font-semibold', state === 'upcoming' ? 'text-text-secondary' : 'text-text-primary')}>
                  {step.label}
                  <span className="sr-only">, {STATE_TEXT[state]}</span>
                </span>
                {step.description && <span className="text-xs text-text-secondary">{step.description}</span>}
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
