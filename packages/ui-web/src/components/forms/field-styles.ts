import { cx } from '../../utils/cx.ts';

export type ControlSize = 'sm' | 'md' | 'lg';

/**
 * Field roots carry `group`, so the control box and its icon chip react to the root's
 * React Aria state (`data-invalid`, `data-disabled`, `data-readonly`, `data-open`).
 */
export const fieldStyles = {
  root: 'group flex flex-col gap-1.5',
  label: 'text-sm font-semibold text-text-primary group-data-disabled:text-text-disabled',
  required: 'ms-0.5 text-feedback-danger-fg',
  description: 'text-sm text-text-secondary',
  error: 'flex items-start gap-1.5 text-sm font-medium text-feedback-danger-fg [&_svg]:mt-0.5 [&_svg]:size-4 [&_svg]:shrink-0',
} as const;

const BOX_SIZES: Record<ControlSize, string> = {
  sm: 'min-h-(--control-sm) gap-2 ps-1 pe-2 text-sm',
  md: 'min-h-(--control-md) gap-2.5 ps-1.5 pe-2.5 text-md',
  lg: 'min-h-(--control-lg) gap-3 ps-2 pe-3 text-md',
};

/** Bordered box that holds the icon chip, the native control and trailing actions. */
export function controlBoxStyles({ size = 'md', multiline = false }: { size?: ControlSize | undefined; multiline?: boolean } = {}): string {
  return cx(
    'flex w-full min-w-0 rounded-md border-(length:--border-control) border-border bg-surface text-text-primary',
    'transition-[border-color,box-shadow,background-color] duration-(--duration-fast) ease-standard',
    'hover:border-text-secondary focus-within:border-focus-ring focus-within:field-halo group-data-open:border-focus-ring',
    'group-data-invalid:border-feedback-danger-fg group-data-invalid:focus-within:field-halo-danger',
    'group-data-disabled:cursor-not-allowed group-data-disabled:border-border-subtle group-data-disabled:bg-surface-disabled',
    'group-data-disabled:text-text-disabled group-data-disabled:hover:border-border-subtle',
    'group-data-readonly:border-dashed group-data-readonly:bg-surface-sunken',
    multiline ? 'items-start py-1.5' : 'items-center',
    BOX_SIZES[size],
  );
}

const CHIP_SIZES: Record<ControlSize, string> = {
  sm: 'size-7 rounded-xs [&_svg]:size-4',
  md: 'size-8 rounded-sm [&_svg]:size-4.5',
  lg: 'size-10 rounded-sm [&_svg]:size-5',
};

/** Icon chip inside a field: tinted at rest, lights up with the brand action color on focus. */
export function fieldIconStyles(size: ControlSize = 'md'): string {
  return cx(
    'pointer-events-none flex shrink-0 items-center justify-center bg-surface-selected text-text-on-secondary',
    'transition-colors duration-(--duration-fast) ease-standard',
    'group-focus-within:bg-action-primary group-focus-within:text-text-on-action',
    'group-data-open:bg-action-primary group-data-open:text-text-on-action',
    'group-data-invalid:bg-feedback-danger-bg group-data-invalid:text-feedback-danger-fg',
    'group-data-disabled:bg-transparent group-data-disabled:text-text-disabled',
    CHIP_SIZES[size],
  );
}

/** Native input/textarea without chrome; the box draws border, background and focus. */
export const bareInputStyles = cx(
  'h-full min-w-0 flex-1 bg-transparent py-2 text-inherit outline-none placeholder:text-text-secondary',
  'disabled:cursor-not-allowed [&::-webkit-search-cancel-button]:hidden',
);
