import { cx } from '../../utils/cx.ts';

export type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const BASE = cx(
  'relative inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-full',
  'font-semibold outline-none cursor-pointer',
  'transition-[background-color,color,box-shadow,transform,border-color] duration-(--duration-fast) ease-standard',
  'data-focus-visible:focus-ring data-pressed:translate-y-px',
  'data-pending:cursor-wait',
  'data-disabled:cursor-not-allowed data-disabled:translate-y-0 data-disabled:shadow-none',
  'data-disabled:text-text-disabled',
);

/** Solid variants fill with the disabled surface; quiet ones stay transparent when disabled. */
const SOLID_DISABLED = 'data-disabled:bg-surface-disabled';
const QUIET_DISABLED = 'data-disabled:bg-transparent data-disabled:border-border-subtle';

/** Solid variants carry the «ribbon fold» underside that flattens when pressed. */
const VARIANTS: Record<ButtonVariant, string> = {
  primary: cx(
    'bg-action-primary text-text-on-action ribbon-fold', SOLID_DISABLED,
    'data-hovered:bg-action-primary-hover data-pressed:bg-action-primary-pressed data-pressed:ribbon-fold-pressed',
  ),
  accent: cx(
    'bg-action-accent text-text-on-accent ribbon-fold', SOLID_DISABLED,
    'data-hovered:bg-action-accent-hover data-pressed:ribbon-fold-pressed',
  ),
  secondary: cx('bg-action-secondary text-text-on-secondary data-hovered:bg-action-secondary-hover', SOLID_DISABLED),
  outline: cx(
    'border-(length:--border-control) border-border bg-transparent text-text-primary',
    'data-hovered:bg-surface-hover data-pressed:bg-surface-selected', QUIET_DISABLED,
  ),
  ghost: cx('bg-transparent text-text-primary data-hovered:bg-surface-hover data-pressed:bg-surface-selected', QUIET_DISABLED),
  danger: cx(
    'bg-action-danger text-text-on-danger ribbon-fold', SOLID_DISABLED,
    'data-hovered:bg-action-danger-hover data-pressed:ribbon-fold-pressed',
  ),
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-(--control-sm) px-3.5 text-sm [&_svg]:size-4',
  md: 'h-(--control-md) px-5 text-sm [&_svg]:size-5',
  lg: 'h-(--control-lg) px-6 text-md [&_svg]:size-5',
};

const ICON_SIZES: Record<ButtonSize, string> = {
  sm: 'size-(--control-sm) [&_svg]:size-4',
  md: 'size-(--control-md) [&_svg]:size-5',
  lg: 'size-(--control-lg) [&_svg]:size-6',
};

export interface ButtonStyleOptions {
  variant?: ButtonVariant | undefined;
  size?: ButtonSize | undefined;
  fullWidth?: boolean | undefined;
  iconOnly?: boolean | undefined;
}

export function buttonStyles({ variant = 'primary', size = 'md', fullWidth, iconOnly }: ButtonStyleOptions = {}): string {
  return cx(BASE, VARIANTS[variant], iconOnly ? ICON_SIZES[size] : SIZES[size], fullWidth && 'w-full');
}
