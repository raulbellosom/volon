import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { cx } from '../../utils/cx.ts';
import { IconChip, type IconChipTone } from '../content/IconChip.tsx';

export interface StatDelta {
  /** Already formatted, e.g. «+12%» or «−3 min». */
  value: string;
  direction: 'up' | 'down' | 'flat';
  /** Whether the change is good news; «down» can be positive (fewer incidents). */
  sentiment: 'positive' | 'negative' | 'neutral';
  /** Comparison period, e.g. «vs. semana pasada». */
  period?: string;
}

export interface StatProps {
  label: ReactNode;
  /** Already formatted value with tabular figures. */
  value: ReactNode;
  icon?: ReactNode;
  iconTone?: IconChipTone;
  delta?: StatDelta;
  /** Extra context under the value. */
  hint?: ReactNode;
  className?: string;
}

const SENTIMENT = {
  positive: 'bg-feedback-success-bg text-feedback-success-fg',
  negative: 'bg-feedback-danger-bg text-feedback-danger-fg',
  neutral: 'bg-surface-sunken text-text-secondary',
} as const;

const ARROW = { up: ArrowUpRight, down: ArrowDownRight, flat: ArrowRight } as const;
const DIRECTION_TEXT = { up: 'subió', down: 'bajó', flat: 'sin cambio' } as const;

/** Key figure with label, optional trend and context. Place inside a Card or a grid. */
export function Stat({ label, value, icon, iconTone, delta, hint, className }: StatProps) {
  const Arrow = delta ? ARROW[delta.direction] : undefined;
  return (
    <div className={cx('flex items-start gap-4', className)}>
      {icon && <IconChip icon={icon} {...(iconTone ? { tone: iconTone } : {})} />}
      <dl className="flex min-w-0 flex-col gap-1">
        <dt className="text-sm text-text-secondary">{label}</dt>
        <dd className="text-3xl font-extrabold tracking-tight tabular-nums text-text-primary">{value}</dd>
        {(delta || hint) && (
          <dd className="flex flex-wrap items-center gap-2 text-sm text-text-secondary">
            {delta && Arrow && (
              <span className={cx('inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 font-semibold tabular-nums', SENTIMENT[delta.sentiment])}>
                <Arrow aria-hidden="true" className="size-3.5" />
                <span className="sr-only">{DIRECTION_TEXT[delta.direction]} </span>
                {delta.value}
              </span>
            )}
            {delta?.period && <span>{delta.period}</span>}
            {hint && <span>{hint}</span>}
          </dd>
        )}
      </dl>
    </div>
  );
}
