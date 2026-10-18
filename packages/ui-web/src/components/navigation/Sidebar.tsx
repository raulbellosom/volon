import type { ReactNode } from 'react';
import { Link as AriaLink } from 'react-aria-components';
import { cx } from '../../utils/cx.ts';
import { Tooltip } from '../overlays/Tooltip.tsx';

export interface SidebarProps {
  /** Names the navigation landmark, e.g. «Navegación del panel». */
  'aria-label': string;
  /** Top area: logo or workspace switcher. */
  header?: ReactNode;
  /** Bottom area: account, settings, theme toggle. */
  footer?: ReactNode;
  /** Icon-only rail; labels move to tooltips. */
  collapsed?: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * Vertical navigation for desktop and tablet layouts. On phones render its sections inside
 * a Drawer (see the Sidebar story) instead of shrinking it.
 */
export function Sidebar({ header, footer, collapsed, children, className, ...props }: SidebarProps) {
  return (
    <nav
      aria-label={props['aria-label']}
      data-collapsed={collapsed || undefined}
      className={cx(
        'group/sidebar flex h-full flex-col gap-4 border-e border-border-subtle bg-surface py-4 transition-[width] duration-(--duration-base)',
        collapsed ? 'w-18 items-center px-2' : 'w-64 px-3',
        className,
      )}
    >
      {header && <div className={cx('flex items-center', collapsed ? 'justify-center' : 'px-2')}>{header}</div>}
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto">{children}</div>
      {footer && <div className="border-t border-border-subtle pt-3">{footer}</div>}
    </nav>
  );
}

export interface SidebarSectionProps {
  /** Group title; hidden visually when collapsed but kept for screen readers. */
  title?: string;
  children: ReactNode;
}

export function SidebarSection({ title, children }: SidebarSectionProps) {
  return (
    <section aria-label={title} className="flex flex-col gap-1">
      {title && (
        <h3 className="px-3 pb-1 text-xs font-bold uppercase tracking-overline text-text-secondary group-data-collapsed/sidebar:sr-only">
          {title}
        </h3>
      )}
      <ul className="flex flex-col gap-1">{children}</ul>
    </section>
  );
}

export interface SidebarItemProps {
  href: string;
  label: string;
  icon: ReactNode;
  isCurrent?: boolean;
  /** Pending count shown as a pill (or a dot when collapsed). */
  count?: number;
  collapsed?: boolean;
}

const ITEM = cx(
  'relative flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold text-text-secondary outline-none',
  'transition-colors data-hovered:bg-surface-hover data-hovered:text-text-primary data-focus-visible:focus-ring',
  'aria-[current=page]:bg-surface-selected aria-[current=page]:text-text-on-secondary [&_svg]:size-5 [&_svg]:shrink-0',
  "aria-[current=page]:before:absolute aria-[current=page]:before:inset-y-2 aria-[current=page]:before:-start-3 aria-[current=page]:before:w-1 aria-[current=page]:before:rounded-full aria-[current=page]:before:bg-action-primary aria-[current=page]:before:content-['']",
);

export function SidebarItem({ href, label, icon, isCurrent, count, collapsed }: SidebarItemProps) {
  const link = (
    <AriaLink
      href={href}
      {...(isCurrent ? { 'aria-current': 'page' as const } : {})}
      {...(collapsed ? { 'aria-label': count ? `${label}, ${count} pendientes` : label } : {})}
      className={cx(ITEM, collapsed && 'justify-center px-0')}
    >
      <span aria-hidden="true" className="flex">{icon}</span>
      {!collapsed && <span className="min-w-0 flex-1 truncate">{label}</span>}
      {count !== undefined && count > 0 && (collapsed
        ? <span aria-hidden="true" className="absolute end-2 top-2 size-2 rounded-full bg-status-failed-bg" />
        : (
          <>
            <span aria-hidden="true" className="rounded-full bg-selection-fill px-2 text-xs font-bold tabular-nums text-selection-mark">{count}</span>
            {/* Separate words explicitly: accessible names join inline elements without spaces. */}
            <span className="sr-only">, {count} pendientes</span>
          </>
        ))}
    </AriaLink>
  );
  return <li>{collapsed ? <Tooltip content={label} placement="end">{link}</Tooltip> : link}</li>;
}
