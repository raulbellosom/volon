import { Bike, CircleCheck, CircleX, Clock, Radar, TriangleAlert, type LucideIcon } from 'lucide-react';
import { cx } from '../../utils/cx.ts';

/** Delivery status colors approved in docs/brand/identity.md. Visual only; not a state machine. */
export type DeliveryStatusTone = 'requested' | 'searching' | 'in-transit' | 'delivered' | 'incident' | 'failed';

interface StatusPresentation {
  label: string;
  icon: LucideIcon;
  classes: string;
  /** Live states show a pulsing dot to signal that something is happening right now. */
  live?: boolean;
}

const STATUSES: Record<DeliveryStatusTone, StatusPresentation> = {
  requested: { label: 'Solicitada', icon: Clock, classes: 'bg-status-requested-bg text-status-requested-fg' },
  searching: { label: 'Buscando repartidor', icon: Radar, classes: 'bg-status-searching-bg text-status-searching-fg', live: true },
  'in-transit': {
    label: 'En camino',
    icon: Bike,
    // Inset lime ring keeps the chip visible when its deep blue matches the dark surface.
    classes: 'bg-status-in-transit-bg text-status-in-transit-fg ring-1 ring-inset ring-status-in-transit-fg/35',
    live: true,
  },
  delivered: { label: 'Entregada', icon: CircleCheck, classes: 'bg-status-delivered-bg text-status-delivered-fg' },
  incident: { label: 'Incidencia', icon: TriangleAlert, classes: 'bg-status-incident-bg text-status-incident-fg' },
  failed: { label: 'Cancelada', icon: CircleX, classes: 'bg-status-failed-bg text-status-failed-fg' },
};

export interface StatusBadgeProps {
  status: DeliveryStatusTone;
  /** Overrides the default Spanish label (e.g. a more specific backend reason). */
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
}

/** Solid status chip; icon + text so meaning never depends on color alone. */
export function StatusBadge({ status, label, size = 'md', className }: StatusBadgeProps) {
  const { label: defaultLabel, icon: Icon, classes, live } = STATUSES[status];
  return (
    <span
      className={cx(
        'inline-flex w-fit items-center whitespace-nowrap rounded-full font-semibold',
        size === 'sm' ? 'h-6 gap-1.5 px-2.5 text-xs [&_svg]:size-3.5' : 'h-8 gap-2 px-3 text-sm [&_svg]:size-4',
        classes,
        className,
      )}
    >
      <Icon aria-hidden="true" />
      {label ?? defaultLabel}
      {live && (
        <span aria-hidden="true" className="relative flex size-2">
          <span className="absolute inset-0 animate-ping rounded-full bg-current opacity-60 motion-reduce:hidden" />
          <span className="relative size-2 rounded-full bg-current" />
        </span>
      )}
    </span>
  );
}
