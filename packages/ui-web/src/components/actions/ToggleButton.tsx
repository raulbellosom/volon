import type { ReactNode } from 'react';
import { ToggleButton as AriaToggleButton, type ToggleButtonProps as AriaToggleButtonProps } from 'react-aria-components';
import { cx } from '../../utils/cx.ts';
import { buttonStyles, type ButtonSize } from './button-styles.ts';

export interface ToggleButtonProps extends Omit<AriaToggleButtonProps, 'children' | 'className'> {
  /** Visible label; omit for icon-only and pass `label`. */
  children?: ReactNode;
  icon?: ReactNode;
  /** Accessible name for icon-only toggles. */
  label?: string;
  size?: ButtonSize;
  className?: string;
}

/**
 * Two-state button exposed as `aria-pressed` (e.g. «Solo urgentes», favorite). Pressed
 * state uses the brand selection pair; the label must not change between states.
 */
export function ToggleButton({ children, icon, label, size, className, ...props }: ToggleButtonProps) {
  const iconOnly = !children;
  return (
    <AriaToggleButton
      {...props}
      {...(label ? { 'aria-label': label } : {})}
      className={cx(
        buttonStyles({ variant: 'outline', size, iconOnly }),
        'data-selected:border-selection-fill data-selected:bg-selection-fill data-selected:text-selection-mark',
        'data-selected:data-hovered:bg-selection-fill',
        className,
      )}
    >
      {icon}
      {children && <span>{children}</span>}
    </AriaToggleButton>
  );
}
