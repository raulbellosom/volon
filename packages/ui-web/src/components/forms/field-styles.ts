import { cx } from '../../utils/cx.ts';

export type ControlSize = 'sm' | 'md' | 'lg';

export const fieldStyles = {
  root: 'group flex flex-col gap-1.5',
  label: 'text-sm font-semibold text-text-primary group-data-disabled:text-text-disabled',
  required: 'ms-0.5 text-feedback-danger-fg',
  description: 'text-sm text-text-secondary',
  error: 'flex items-start gap-1.5 text-sm font-medium text-feedback-danger-fg [&_svg]:mt-0.5 [&_svg]:size-4 [&_svg]:shrink-0',
} as const;

const CONTROL_SIZES: Record<ControlSize, string> = {
  sm: 'h-(--control-sm) px-3 text-sm',
  md: 'h-(--control-md) px-3.5 text-md',
  lg: 'h-(--control-lg) px-4 text-md',
};

/**
 * Text-like control surface shared by inputs, select triggers and pickers. Input text is
 * 16 px at the default size so iOS does not zoom on focus.
 */
export function controlStyles({ size = 'md', multiline = false }: { size?: ControlSize | undefined; multiline?: boolean } = {}): string {
  return cx(
    'w-full min-w-0 rounded-md border-(length:--border-control) border-border bg-surface text-text-primary outline-none',
    'placeholder:text-text-secondary',
    'transition-[border-color,box-shadow,background-color] duration-(--duration-fast) ease-standard',
    'data-hovered:border-text-secondary',
    'data-focused:border-focus-ring data-focused:field-halo data-focus-within:border-focus-ring data-focus-within:field-halo',
    'data-invalid:border-feedback-danger-fg data-invalid:data-focused:field-halo-danger',
    'data-disabled:cursor-not-allowed data-disabled:border-border-subtle data-disabled:bg-surface-disabled data-disabled:text-text-disabled',
    '[&[readonly]]:border-dashed [&[readonly]]:bg-surface-sunken',
    multiline ? 'min-h-24 resize-y px-3.5 py-2.5 text-md' : CONTROL_SIZES[size],
  );
}
