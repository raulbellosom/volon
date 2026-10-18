import { CloudOff, LocateFixed, LocateOff, RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { cx } from '../../utils/cx.ts';

/**
 * - `live`: real-time updates and a fresh location.
 * - `stale`: connected but the last location is old; never present it as current.
 * - `reconnecting`: realtime channel lost; data is refreshed from the API meanwhile.
 * - `offline`: no connection; what is shown may be outdated.
 */
export type ConnectionState = 'live' | 'stale' | 'reconnecting' | 'offline';

const STATES: Record<ConnectionState, { label: string; icon: ReactNode; classes: string }> = {
  live: { label: 'En vivo', icon: <LocateFixed />, classes: 'bg-feedback-success-bg text-feedback-success-fg' },
  stale: { label: 'Ubicación sin actualizar', icon: <LocateOff />, classes: 'bg-feedback-warning-bg text-feedback-warning-fg' },
  reconnecting: { label: 'Reconectando', icon: <RefreshCw className="animate-spin" />, classes: 'bg-feedback-info-bg text-feedback-info-fg' },
  offline: { label: 'Sin conexión', icon: <CloudOff />, classes: 'bg-feedback-danger-bg text-feedback-danger-fg' },
};

export interface ConnectionStatusProps {
  state: ConnectionState;
  /** Freshness of the last update, already formatted, e.g. «hace 3 min». */
  lastUpdated?: string;
  className?: string;
}

/**
 * Realtime/GPS freshness indicator for tracking views. Changes are announced politely; the
 * colors pair with text, and a stale location is labelled as such (RF-016).
 */
export function ConnectionStatus({ state, lastUpdated, className }: ConnectionStatusProps) {
  const { label, icon, classes } = STATES[state];
  return (
    <span role="status" className={cx('inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold', classes, className)}>
      <span aria-hidden="true" className="relative flex [&_svg]:size-4">
        {icon}
        {state === 'live' && <span className="absolute -end-0.5 -top-0.5 size-2 animate-ping rounded-full bg-current motion-reduce:hidden" />}
      </span>
      <span>
        {label}
        {lastUpdated && <span className="font-normal"> · {lastUpdated}</span>}
      </span>
    </span>
  );
}
