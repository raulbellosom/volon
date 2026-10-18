import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../../utils/cx.ts';
import { IconChip, type IconChipTone } from './IconChip.tsx';

export type CardVariant = 'elevated' | 'outline' | 'sunken' | 'brand';

/**
 * `brand` re-maps semantic tokens inside its subtree, so nested text, chips and dividers
 * adapt to the deep → electric blue panel without special-casing each component.
 * Pair it with the `accent` button variant.
 */
const BRAND_SCOPE = cx(
  'bg-[linear-gradient(135deg,var(--color-brand-surface-start)_0%,var(--color-brand-surface-end)_100%)] shadow-2',
  '[--color-text-primary:var(--color-text-on-brand)]',
  '[--color-text-secondary:color-mix(in_srgb,var(--color-text-on-brand)_80%,transparent)]',
  '[--color-border-subtle:color-mix(in_srgb,var(--color-text-on-brand)_16%,transparent)]',
  '[--color-surface-selected:color-mix(in_srgb,var(--color-text-on-brand)_14%,transparent)]',
  '[--color-text-on-secondary:var(--color-accent)]',
);

const VARIANTS: Record<CardVariant, string> = {
  elevated: 'border border-border-subtle bg-surface shadow-1',
  outline: 'border border-border-subtle bg-surface',
  sunken: 'bg-surface-sunken',
  brand: BRAND_SCOPE,
};

export interface CardProps extends HTMLAttributes<HTMLElement> {
  variant?: CardVariant;
  /** Renders a semantic sectioning element when the card is a standalone region. */
  as?: 'div' | 'section' | 'article';
}

/** Container for one coherent piece of content. Prefer a plain list for many similar rows. */
export function Card({ variant = 'elevated', as: Element = 'div', className, ...props }: CardProps) {
  return (
    <Element {...props} className={cx('flex flex-col overflow-hidden rounded-xl text-text-primary', VARIANTS[variant], className)} />
  );
}

export interface CardHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  /** Small uppercase label above the title (echoes the logo tagline). */
  overline?: ReactNode;
  /** Visual anchor shown in a tinted chip before the title. */
  icon?: ReactNode;
  iconTone?: IconChipTone;
  /** Trailing actions such as an IconButton or a Badge. */
  action?: ReactNode;
  /** Heading level for the title; choose it from the page outline. */
  level?: 2 | 3 | 4;
  className?: string;
}

export function CardHeader({ title, description, overline, icon, iconTone, action, level = 3, className }: CardHeaderProps) {
  const Heading = `h${level}` as const;
  return (
    <div className={cx('flex items-start gap-4 px-5 pt-5', className)}>
      {icon && <IconChip icon={icon} {...(iconTone ? { tone: iconTone } : {})} />}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {overline && <p className="text-xs font-bold uppercase tracking-overline text-text-secondary">{overline}</p>}
        <Heading className="text-lg font-bold text-text-primary">{title}</Heading>
        {description && <p className="text-sm text-text-secondary">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={cx('px-5 py-4 text-md', className)} />;
}

const FOOTER_ALIGN = { start: 'justify-start', end: 'justify-end', between: 'justify-between' } as const;

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  /** Action alignment; defaults to the end, where the primary action sits. */
  align?: keyof typeof FOOTER_ALIGN;
}

export function CardFooter({ align = 'end', className, ...props }: CardFooterProps) {
  return (
    <div
      {...props}
      className={cx('mt-auto flex flex-wrap items-center gap-3 border-t border-border-subtle px-5 py-4', FOOTER_ALIGN[align], className)}
    />
  );
}
