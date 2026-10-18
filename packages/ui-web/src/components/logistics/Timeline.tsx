import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { cx } from '../../utils/cx.ts';

export type TimelineState = 'done' | 'current' | 'upcoming' | 'problem';

export interface TimelineEvent {
  id: string;
  title: ReactNode;
  /** Already formatted for display, e.g. «14:05». */
  time?: string;
  /** ISO value for the <time> element, e.g. «2026-10-18T14:05:00-06:00». */
  dateTime?: string;
  description?: ReactNode;
  state: TimelineState;
  /** Overrides the default marker content. */
  icon?: ReactNode;
}

const STATE_TEXT: Record<TimelineState, string> = { done: 'completado', current: 'en curso', upcoming: 'pendiente', problem: 'incidencia' };

const MARKER: Record<TimelineState, string> = {
  done: 'bg-selection-fill text-selection-mark',
  current: 'bg-action-primary text-text-on-action ring-4 ring-surface-selected',
  upcoming: 'bg-surface-sunken text-text-secondary',
  problem: 'bg-status-incident-bg text-status-incident-fg',
};

export interface TimelineProps {
  events: readonly TimelineEvent[];
  'aria-label': string;
  className?: string;
}

/**
 * Chronological events of a delivery (requested → assigned → picked up → delivered).
 * Presentational only: states come from the server; nothing here advances a delivery.
 */
export function Timeline({ events, className, ...props }: TimelineProps) {
  return (
    <ol aria-label={props['aria-label']} className={cx('flex flex-col', className)}>
      {events.map((event, index) => {
        const last = index === events.length - 1;
        return (
          <li key={event.id} {...(event.state === 'current' ? { 'aria-current': 'step' as const } : {})} className="flex gap-4">
            <div className="flex flex-col items-center">
              <span className={cx('relative flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold [&_svg]:size-4', MARKER[event.state])}>
                {event.icon ?? (event.state === 'done' ? <Check aria-hidden="true" strokeWidth={3} /> : <span aria-hidden="true" className="size-2 rounded-full bg-current" />)}
                {event.state === 'current' && (
                  <span aria-hidden="true" className="absolute inset-0 animate-ping rounded-full bg-action-primary opacity-30 motion-reduce:hidden" />
                )}
              </span>
              {!last && (
                <span aria-hidden="true" className={cx('my-1 w-0.5 flex-1 rounded-full', event.state === 'done' ? 'bg-selection-fill' : 'bg-border-subtle')} />
              )}
            </div>
            <div className={cx('flex min-w-0 flex-1 flex-col gap-0.5', !last && 'pb-6')}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <p className={cx('text-md font-semibold', event.state === 'upcoming' ? 'text-text-secondary' : 'text-text-primary')}>
                  {event.title}
                  <span className="sr-only">, {STATE_TEXT[event.state]}</span>
                </p>
                {event.time && (
                  <time {...(event.dateTime ? { dateTime: event.dateTime } : {})} className="text-sm tabular-nums text-text-secondary">{event.time}</time>
                )}
              </div>
              {event.description && <div className="text-sm text-text-secondary">{event.description}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
