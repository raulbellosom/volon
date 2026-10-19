import { ChevronRight, Package } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link as AriaLink } from 'react-aria-components';
import { StatusBadge, type DeliveryStatusTone } from '../content/StatusBadge.tsx';
import { cx } from '../../utils/cx.ts';
import { formatMXN } from '../../utils/format.ts';

export interface DeliveryListProps {
  /** Names the list, e.g. «Envíos de Sucursal Centro». */
  'aria-label': string;
  children: ReactNode;
  className?: string;
}

/** Vertical list of deliveries; each child is a `DeliveryListItem`. */
export function DeliveryList({ children, className, ...props }: DeliveryListProps) {
  return (
    <ul aria-label={props['aria-label']} className={cx('flex flex-col divide-y divide-border-subtle overflow-hidden rounded-xl border border-border-subtle bg-surface', className)}>
      {children}
    </ul>
  );
}

export interface DeliveryListItemProps {
  /** Detail page of this delivery. */
  href: string;
  /** Main line people scan for, usually the request date and time. */
  title: ReactNode;
  /** Human-facing folio, kept complete on its own line on narrow screens. */
  reference: string;
  status: DeliveryStatusTone;
  /** Overrides the default status wording. */
  statusLabel?: string;
  /** Integer centavos as returned by the server; never computed in the client. */
  amountMinor: number;
}

/**
 * One delivery as a single link: date, folio, status and amount. Stacks on phones and lines
 * up in columns from `sm`. Presentational only; the caller maps API data to props.
 */
export function DeliveryListItem({ href, title, reference, status, statusLabel, amountMinor }: DeliveryListItemProps) {
  return (
    <li>
      <AriaLink
        href={href}
        className={cx(
          'grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-4 text-text-primary outline-none transition-colors sm:px-5',
          'sm:grid-cols-[auto_minmax(0,1fr)_auto_auto_auto]',
          'hover:bg-surface-hover data-focus-visible:focus-ring data-focus-visible:-outline-offset-2',
        )}
      >
        <span aria-hidden="true" className="row-span-3 flex size-10 items-center justify-center rounded-full bg-surface-selected text-text-on-secondary sm:row-span-2 [&_svg]:size-5">
          <Package />
        </span>
        <span className="col-start-2 min-w-0 text-md font-semibold">{title}</span>
        <span className="col-span-2 col-start-2 row-start-2 whitespace-nowrap font-mono text-xs text-text-secondary sm:col-span-1">
          <span className="font-sans">Folio </span>{reference}
        </span>
        <span className="col-start-3 row-start-1 text-end text-md font-bold tabular-nums sm:col-start-4 sm:row-span-2 sm:min-w-20">{formatMXN(amountMinor)}</span>
        <StatusBadge status={status} size="sm" {...(statusLabel ? { label: statusLabel } : {})} className="col-start-2 row-start-3 sm:col-start-3 sm:row-span-2 sm:row-start-1" />
        <ChevronRight aria-hidden="true" className="col-start-5 row-span-2 row-start-1 hidden size-5 text-text-secondary sm:block" />
      </AriaLink>
    </li>
  );
}
