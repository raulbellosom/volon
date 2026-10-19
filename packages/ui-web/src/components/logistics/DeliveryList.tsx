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
  /** Human-facing folio, always shown complete (wraps rather than clipping on narrow screens). */
  reference: string;
  status: DeliveryStatusTone;
  /** Overrides the default status wording. */
  statusLabel?: string;
  /** Integer centavos as returned by the server; never computed in the client. */
  amountMinor: number;
}

/**
 * One delivery as a single link. Layout comes from explicit groups, never grid auto-placement,
 * and switches on a container query in rem (`@lg` = 32rem), so it reacts to both the space the
 * list really has and the user's text size:
 * - roomy: icon · (date over full folio) · status · amount · chevron in one compact row;
 * - narrow or large text: icon · (date, folio, then status and amount on one wrapping line);
 * - very narrow (under 16rem, e.g. a 320px phone at 200% text): the decorative icon steps aside for the text.
 * `data-part` marks each piece for the browser geometry check (scripts/check-geometry.mjs).
 * Presentational only; the caller maps API data to props.
 */
export function DeliveryListItem({ href, title, reference, status, statusLabel, amountMinor }: DeliveryListItemProps) {
  return (
    <li className="@container">
      <AriaLink
        href={href}
        className={cx(
          'flex items-start gap-3 px-4 py-3 text-text-primary outline-none transition-colors @lg:items-center @lg:gap-4 @lg:px-5',
          'hover:bg-surface-hover data-focus-visible:focus-ring data-focus-visible:-outline-offset-2',
        )}
      >
        <span data-part="icon" aria-hidden="true" className="flex size-10 shrink-0 @max-[16rem]:hidden items-center justify-center rounded-full bg-surface-selected text-text-on-secondary [&_svg]:size-5">
          <Package />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1.5 @lg:flex-row @lg:items-center @lg:gap-4">
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span data-part="title" className="text-md font-semibold">{title}</span>
            <span data-part="reference" className="text-xs text-text-secondary [overflow-wrap:anywhere]">
              Folio <span className="font-mono">{reference}</span>
            </span>
          </span>
          <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 @lg:contents">
            <span data-part="status" className="flex min-w-0 @lg:max-w-56 @lg:shrink-0">
              <StatusBadge status={status} size="sm" wrap {...(statusLabel ? { label: statusLabel } : {})} />
            </span>
            <span data-part="amount" className="shrink-0 text-end text-md font-bold tabular-nums @lg:min-w-20">{formatMXN(amountMinor)}</span>
          </span>
        </span>
        <ChevronRight data-part="chevron" aria-hidden="true" className="hidden size-5 shrink-0 text-text-secondary @lg:block" />
      </AriaLink>
    </li>
  );
}
