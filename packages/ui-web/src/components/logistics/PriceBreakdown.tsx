import type { ReactNode } from 'react';
import { cx } from '../../utils/cx.ts';
import { formatMXN } from '../../utils/format.ts';

export interface PriceLine {
  id: string;
  label: ReactNode;
  /** Positive integer centavos as returned by the server. */
  amountMinor: number;
  /** `discount` is shown with a minus sign and success color. */
  kind?: 'charge' | 'discount';
  hint?: ReactNode;
}

export interface PriceBreakdownProps {
  lines: readonly PriceLine[];
  /** Total computed by the server. The component never adds amounts itself. */
  totalMinor: number;
  totalLabel?: ReactNode;
  /** Legal or validity note, e.g. «Precio válido por 10 min · IVA incluido». */
  footnote?: ReactNode;
  className?: string;
}

/**
 * Itemized quote (base fee, distance, discounts) with an emphasized total. Display-only:
 * amounts and total come from the backend quote; nothing is calculated in the client.
 */
export function PriceBreakdown({ lines, totalMinor, totalLabel = 'Total', footnote, className }: PriceBreakdownProps) {
  return (
    <div className={cx('flex flex-col gap-3', className)}>
      <dl className="flex flex-col gap-2.5">
        {lines.map((line) => {
          const discount = line.kind === 'discount';
          return (
            <div key={line.id} className="flex items-start justify-between gap-4">
              <dt className="flex min-w-0 flex-col text-md text-text-secondary">
                <span>{line.label}</span>
                {line.hint && <span className="text-xs">{line.hint}</span>}
              </dt>
              <dd className={cx('shrink-0 text-md font-semibold tabular-nums', discount ? 'text-feedback-success-fg' : 'text-text-primary')}>
                {discount && <span className="sr-only">Descuento de </span>}
                {discount ? '−' : ''}{formatMXN(line.amountMinor)}
              </dd>
            </div>
          );
        })}
        <div className="mt-1 flex items-baseline justify-between gap-4 border-t-2 border-dashed border-border-subtle pt-3">
          <dt className="text-lg font-bold text-text-primary">{totalLabel}</dt>
          <dd className="text-2xl font-extrabold tracking-tight tabular-nums text-text-primary">{formatMXN(totalMinor)}</dd>
        </div>
      </dl>
      {footnote && <p className="text-xs text-text-secondary">{footnote}</p>}
    </div>
  );
}
