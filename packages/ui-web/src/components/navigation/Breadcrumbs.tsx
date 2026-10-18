import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Breadcrumb as AriaBreadcrumb,
  Breadcrumbs as AriaBreadcrumbs,
  Link as AriaLink,
} from 'react-aria-components';
import { cx } from '../../utils/cx.ts';

export interface Crumb {
  id: string;
  label: string;
  /** Omit on the current page (last item). */
  href?: string;
}

export interface BreadcrumbsProps {
  items: readonly Crumb[];
  className?: string;
}

const CRUMB_LINK = cx(
  'max-w-48 truncate rounded-xs text-sm text-text-secondary outline-none transition-colors',
  'data-hovered:text-text-primary data-hovered:underline underline-offset-[3px] data-focus-visible:focus-ring',
  'data-current:font-semibold data-current:text-text-primary data-current:no-underline',
);

/**
 * Shows where the page sits in the hierarchy. The last item is the current page. Phones
 * show a single «back to parent» link to save space.
 */
export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  const parent = items.length > 1 ? items[items.length - 2] : undefined;
  return (
    <nav aria-label="Ruta de navegación" className={className}>
      {parent?.href && (
        <AriaLink href={parent.href} className={cx(CRUMB_LINK, 'inline-flex max-w-full items-center gap-1 sm:hidden')}>
          <ChevronLeft aria-hidden="true" className="size-4 shrink-0" />
          <span className="truncate">{parent.label}</span>
        </AriaLink>
      )}
      <AriaBreadcrumbs items={items} className={cx('flex-wrap items-center gap-1.5', parent?.href ? 'hidden sm:flex' : 'flex')}>
        {(item) => (
          <AriaBreadcrumb id={item.id} className="flex items-center gap-1.5">
            {({ isCurrent }) => (
              <>
                <AriaLink {...(item.href ? { href: item.href } : {})} className={CRUMB_LINK}>{item.label}</AriaLink>
                {!isCurrent && <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-text-secondary" />}
              </>
            )}
          </AriaBreadcrumb>
        )}
      </AriaBreadcrumbs>
    </nav>
  );
}
