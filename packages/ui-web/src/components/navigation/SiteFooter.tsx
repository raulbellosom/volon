import { brand } from '@delivery/branding';
import type { ReactNode } from 'react';
import { Link } from 'react-aria-components';
import { brandScope } from '../../utils/brand-scope.ts';
import { cx } from '../../utils/cx.ts';
import { Logo } from '../brand/Logo.tsx';

export interface FooterColumn {
  title: string;
  links: readonly { label: string; href: string }[];
}

export interface SiteFooterProps {
  columns: readonly FooterColumn[];
  /** Bottom row: copyright, legal links. */
  legal?: ReactNode;
  /** Extra content beside the brand block (e.g. ThemeToggle, store badges). */
  aside?: ReactNode;
  /** `brand` uses the blue gradient panel and the white logo. */
  tone?: 'surface' | 'brand';
  className?: string;
}

const LINK = cx(
  'rounded-xs text-sm text-text-secondary outline-none transition-colors',
  'data-hovered:text-text-primary data-hovered:underline data-focus-visible:focus-ring',
);

/** Site footer: brand block, link columns (stacked on phones) and a legal row. */
export function SiteFooter({ columns, legal, aside, tone = 'surface', className }: SiteFooterProps) {
  const isBrand = tone === 'brand';
  return (
    <footer className={cx('text-text-primary', isBrand ? brandScope : 'border-t border-border-subtle bg-surface', className)}>
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.2fr_2fr]">
        <div className="flex flex-col items-start gap-4">
          <Logo variant="tagline" size="lg" {...(isBrand ? { onBrand: true } : {})} />
          <p className="max-w-xs text-sm text-text-secondary">Envíos locales para comercios. {brand.tagline}.</p>
          {aside}
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {columns.map((column) => (
            <nav key={column.title} aria-label={column.title} className="flex flex-col gap-3">
              <p className="text-xs font-bold uppercase tracking-overline text-text-secondary">{column.title}</p>
              <ul className="flex flex-col gap-2.5">
                {column.links.map((link) => (
                  <li key={link.href}><Link href={link.href} className={LINK}>{link.label}</Link></li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>
      {legal && (
        <div className="border-t border-border-subtle">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-5 text-xs text-text-secondary sm:px-6">
            {legal}
          </div>
        </div>
      )}
    </footer>
  );
}
