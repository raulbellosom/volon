import { Menu as MenuIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { DialogTrigger, Link } from 'react-aria-components';
import { cx } from '../../utils/cx.ts';
import { IconButton } from '../actions/IconButton.tsx';
import { Logo } from '../brand/Logo.tsx';
import { Drawer } from '../overlays/Drawer.tsx';

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon?: ReactNode;
}

export interface NavbarProps {
  items: readonly NavItem[];
  /** Id of the item for the current page; gets `aria-current="page"`. */
  currentId?: string;
  /** Brand area; defaults to the official logo. */
  logo?: ReactNode;
  /** Right side (theme toggle, notifications, account menu). Also shown in the mobile menu. */
  actions?: ReactNode;
  /** Destination of the logo link. */
  homeHref?: string;
  className?: string;
}

const DESKTOP_LINK = cx(
  'relative flex h-10 items-center gap-2 whitespace-nowrap rounded-full px-3.5 text-sm font-semibold text-text-secondary outline-none',
  'transition-colors duration-(--duration-fast) data-hovered:bg-surface-hover data-hovered:text-text-primary',
  'data-focus-visible:focus-ring aria-[current=page]:text-text-primary [&_svg]:size-4.5',
  "aria-[current=page]:after:absolute aria-[current=page]:after:inset-x-3.5 aria-[current=page]:after:-bottom-[9px] aria-[current=page]:after:h-[3px] aria-[current=page]:after:rounded-full aria-[current=page]:after:bg-action-primary aria-[current=page]:after:content-['']",
);

const MOBILE_LINK = cx(
  'flex min-h-12 items-center gap-3 rounded-md px-3 text-md font-semibold text-text-primary outline-none',
  'data-hovered:bg-surface-hover data-pressed:bg-surface-selected data-focus-visible:focus-ring',
  'aria-[current=page]:bg-surface-selected aria-[current=page]:text-text-on-secondary [&_svg]:size-5',
);

function current(item: NavItem, currentId?: string) {
  return item.id === currentId ? { 'aria-current': 'page' as const } : {};
}

/**
 * Responsive top bar: links inline from `md`, a slide-in menu below it. Sticky with a
 * translucent surface so content scrolls underneath.
 */
export function Navbar({ items, currentId, logo, actions, homeHref = '/', className }: NavbarProps) {
  return (
    <header
      className={cx(
        'sticky top-0 z-(--z-sticky) border-b border-border-subtle',
        'bg-[color-mix(in_srgb,var(--color-surface)_88%,transparent)] backdrop-blur-md',
        className,
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <DialogTrigger>
          <IconButton label="Abrir menú" icon={<MenuIcon />} className="-ms-2 md:hidden" />
          <Drawer side="start" title={<Logo size="sm" />}>
            {(close) => (
              <div className="flex flex-col gap-6">
                <nav aria-label="Principal (móvil)">
                  <ul className="flex flex-col gap-1">
                    {items.map((item) => (
                      <li key={item.id}>
                        <Link href={item.href} onPress={close} className={MOBILE_LINK} {...current(item, currentId)}>
                          {item.icon && <span aria-hidden="true" className="flex">{item.icon}</span>}
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
                {actions && <div className="flex flex-wrap items-center gap-3 border-t border-border-subtle pt-5">{actions}</div>}
              </div>
            )}
          </Drawer>
        </DialogTrigger>
        <Link href={homeHref} aria-label="Inicio" className="flex shrink-0 items-center rounded-md outline-none data-focus-visible:focus-ring">
          {logo ?? <Logo size="sm" alt="" />}
        </Link>
        <nav aria-label="Principal" className="hidden flex-1 md:block">
          <ul className="flex items-center gap-1">
            {items.map((item) => (
              <li key={item.id}>
                <Link href={item.href} className={DESKTOP_LINK} {...current(item, currentId)}>
                  {item.icon && <span aria-hidden="true" className="flex">{item.icon}</span>}
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        {actions && <div className="ms-auto flex items-center gap-2 max-md:[&>*:not(:last-child)]:hidden">{actions}</div>}
      </div>
    </header>
  );
}
