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
  /** Full folio; truncated on screen but read in full by assistive tech. */
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
        <span aria-hidden="true" className="row-span-2 flex size-10 items-center justify-center rounded-full bg-surface-selected text-text-on-secondary sm:row-span-1 [&_svg]:size-5">
          <Package />
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="text-md font-semibold">{title}</span>
          <span className="truncate font-mono text-xs text-text-secondary">
            <span className="font-sans">Folio </span>{reference}
          </span>
        </span>
        <span className="text-end text-md font-bold tabular-nums sm:order-last sm:min-w-20">{formatMXN(amountMinor)}</span>
        <StatusBadge status={status} size="sm" {...(statusLabel ? { label: statusLabel } : {})} className="col-start-2 sm:col-start-auto" />
        <ChevronRight aria-hidden="true" className="hidden size-5 text-text-secondary sm:order-last sm:block" />
      </AriaLink>
    </li>
  );
}
