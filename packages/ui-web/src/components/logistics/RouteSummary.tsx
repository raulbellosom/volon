import { MapPin, Store } from 'lucide-react';
import type { ReactNode } from 'react';
import { cx } from '../../utils/cx.ts';
import { formatDistance, formatDuration } from '../../utils/format.ts';

export interface RouteStop {
  /** Business or recipient name. */
  name: ReactNode;
  address: ReactNode;
  /** Already formatted, e.g. «14:05» or «Ventana 14:00 – 15:00». */
  time?: ReactNode;
}

export interface RouteSummaryProps {
  pickup: RouteStop;
  dropoff: RouteStop;
  /** Route distance from the routing service, in meters. */
  distanceMeters?: number;
  /** Estimated minutes; omit when there is no reliable estimate (never invent an ETA). */
  durationMinutes?: number;
  /** One-line version for lists and tables. */
  compact?: boolean;
  className?: string;
}

function Metrics({ distanceMeters, durationMinutes }: Pick<RouteSummaryProps, 'distanceMeters' | 'durationMinutes'>) {
  const parts = [distanceMeters !== undefined ? formatDistance(distanceMeters) : null, durationMinutes !== undefined ? `≈ ${formatDuration(durationMinutes)}` : null]
    .filter(Boolean);
  return parts.length ? <span className="tabular-nums">{parts.join(' · ')}</span> : null;
}

/** Pickup → drop-off with the brand «ribbon» connector, distance and an optional estimate. */
export function RouteSummary({ pickup, dropoff, distanceMeters, durationMinutes, compact, className }: RouteSummaryProps) {
  if (compact) {
    return (
      <p className={cx('flex min-w-0 flex-wrap items-center gap-x-2 text-sm text-text-secondary', className)}>
        <span className="font-semibold text-text-primary">{pickup.name}</span>
        <span aria-hidden="true">→</span>
        <span className="sr-only">hacia</span>
        <span className="font-semibold text-text-primary">{dropoff.name}</span>
        <Metrics {...(distanceMeters !== undefined ? { distanceMeters } : {})} {...(durationMinutes !== undefined ? { durationMinutes } : {})} />
      </p>
    );
  }
  const stops = [
    { key: 'pickup', label: 'Recogida', stop: pickup, icon: <Store />, marker: 'bg-surface-selected text-text-on-secondary' },
    { key: 'dropoff', label: 'Entrega', stop: dropoff, icon: <MapPin />, marker: 'bg-selection-fill text-selection-mark' },
  ];
  return (
    <div className={cx('flex flex-col gap-3', className)}>
      <ol className="flex flex-col">
        {stops.map(({ key, label, stop, icon, marker }, index) => (
          <li key={key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span aria-hidden="true" className={cx('flex size-9 shrink-0 items-center justify-center rounded-full [&_svg]:size-4.5', marker)}>{icon}</span>
              {index === 0 && <span aria-hidden="true" className="my-1 w-1 flex-1 rounded-full bg-[repeating-linear-gradient(to_bottom,var(--color-selection-fill)_0_6px,transparent_6px_10px)]" />}
            </div>
            <div className={cx('flex min-w-0 flex-1 flex-col gap-0.5', index === 0 && 'pb-5')}>
              <p className="text-xs font-bold uppercase tracking-overline text-text-secondary">{label}</p>
              <p className="text-md font-semibold text-text-primary">{stop.name}</p>
              <p className="text-sm break-words text-text-secondary">{stop.address}</p>
              {stop.time && <p className="text-sm font-semibold tabular-nums text-text-primary">{stop.time}</p>}
            </div>
          </li>
        ))}
      </ol>
      {(distanceMeters !== undefined || durationMinutes !== undefined) && (
        <p className="rounded-md bg-surface-sunken px-3 py-2 text-sm font-semibold text-text-primary">
          <span className="text-text-secondary">Ruta: </span>
          <Metrics {...(distanceMeters !== undefined ? { distanceMeters } : {})} {...(durationMinutes !== undefined ? { durationMinutes } : {})} />
        </p>
      )}
    </div>
  );
}
