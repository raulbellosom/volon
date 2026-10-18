import { cx } from './cx.ts';

/**
 * Deep → electric blue brand panel. Re-maps semantic tokens inside the subtree so nested
 * text, chips, dividers and links adapt without special-casing each component.
 * Pair with the `accent` button variant and the `onBrand` logo.
 */
export const brandScope = cx(
  'bg-[linear-gradient(135deg,var(--color-brand-surface-start)_0%,var(--color-brand-surface-end)_100%)]',
  '[--color-text-primary:var(--color-text-on-brand)]',
  '[--color-text-secondary:color-mix(in_srgb,var(--color-text-on-brand)_80%,transparent)]',
  '[--color-text-link:var(--color-text-on-brand)]',
  '[--color-border-subtle:color-mix(in_srgb,var(--color-text-on-brand)_16%,transparent)]',
  '[--color-surface-hover:color-mix(in_srgb,var(--color-text-on-brand)_10%,transparent)]',
  '[--color-surface-selected:color-mix(in_srgb,var(--color-text-on-brand)_14%,transparent)]',
  '[--color-surface-sunken:color-mix(in_srgb,var(--color-text-on-brand)_10%,transparent)]',
  '[--color-surface:color-mix(in_srgb,var(--color-text-on-brand)_18%,transparent)]',
  '[--color-text-on-secondary:var(--color-accent)]',
  '[--color-focus-ring:var(--color-accent)]',
);
