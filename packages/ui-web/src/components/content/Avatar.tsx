import { useState } from 'react';
import { cx } from '../../utils/cx.ts';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';
export type AvatarStatus = 'online' | 'busy' | 'offline';

const SIZES: Record<AvatarSize, string> = {
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-12 text-md',
  xl: 'size-16 text-xl',
};

const STATUS: Record<AvatarStatus, { label: string; color: string }> = {
  online: { label: 'Disponible', color: 'bg-status-delivered-bg' },
  busy: { label: 'En entrega', color: 'bg-status-incident-bg' },
  offline: { label: 'Desconectado', color: 'bg-border' },
};

/** Up to two initials from a full name («Ana María López» → «AL»). */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] ?? '';
  const last = words.length > 1 ? words[words.length - 1]?.[0] ?? '' : '';
  return (first + last).toLocaleUpperCase('es-MX');
}

export interface AvatarProps {
  /** Person or business name: accessible label and initials fallback. */
  name: string;
  /** Photo URL; initials show while it loads or if it fails. */
  src?: string;
  size?: AvatarSize;
  status?: AvatarStatus;
  className?: string;
}

/** Person or business picture with initials fallback and an optional availability dot. */
export function Avatar({ name, src, size = 'md', status, className }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const label = status ? `${name} · ${STATUS[status].label}` : name;
  return (
    <span role="img" aria-label={label} className={cx('relative inline-flex shrink-0', className)}>
      <span
        className={cx(
          'flex items-center justify-center overflow-hidden rounded-full bg-surface-selected font-bold text-text-on-secondary',
          SIZES[size],
        )}
      >
        {src && !failed ? (
          <img src={src} alt="" onError={() => setFailed(true)} className="size-full object-cover" />
        ) : (
          <span aria-hidden="true">{initials(name)}</span>
        )}
      </span>
      {status && (
        <span aria-hidden="true" className={cx('absolute end-0 bottom-0 size-3 rounded-full ring-2 ring-surface', STATUS[status].color)} />
      )}
    </span>
  );
}

export interface AvatarGroupProps {
  people: readonly { name: string; src?: string }[];
  /** Visible avatars before collapsing the rest into «+N». */
  max?: number;
  size?: AvatarSize;
  className?: string;
}

/** Overlapping avatars for a team or the couriers on a route. */
export function AvatarGroup({ people, max = 4, size = 'md', className }: AvatarGroupProps) {
  const visible = people.slice(0, max);
  const hidden = people.length - visible.length;
  return (
    <span role="group" aria-label={`${people.length} personas`} className={cx('flex items-center -space-x-2', className)}>
      {visible.map((person) => (
        <Avatar key={person.name} name={person.name} size={size} {...(person.src ? { src: person.src } : {})} className="rounded-full ring-2 ring-surface" />
      ))}
      {hidden > 0 && (
        <span
          role="img"
          aria-label={`y ${hidden} más`}
          className={cx('flex items-center justify-center rounded-full bg-surface-sunken font-bold text-text-secondary ring-2 ring-surface', SIZES[size])}
        >
          +{hidden}
        </span>
      )}
    </span>
  );
}
