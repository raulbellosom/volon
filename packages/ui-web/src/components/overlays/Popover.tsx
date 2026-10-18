import { Popover as AriaPopover, type PopoverProps as AriaPopoverProps } from 'react-aria-components';
import { cx, withStyles } from '../../utils/cx.ts';

export const popoverStyles = cx(
  'z-(--z-popover) min-w-(--trigger-width) overflow-auto rounded-lg border border-border-subtle bg-surface-raised p-1.5',
  'text-text-primary shadow-2 outline-none',
  'data-entering:animate-popover-in data-exiting:animate-popover-out',
);

export interface PopoverProps extends Omit<AriaPopoverProps, 'className'> {
  className?: string;
}

/**
 * Floating surface positioned against a trigger. Focus management, Escape, outside
 * click and portal rendering come from React Aria.
 */
export function Popover({ className, offset = 6, ...props }: PopoverProps) {
  return <AriaPopover offset={offset} {...props} className={withStyles(className, () => popoverStyles)} />;
}
