import type { ReactNode } from 'react';
import { Button as AriaButton, type ButtonProps as AriaButtonProps } from 'react-aria-components';
import { cx } from '../../utils/cx.ts';
import { SpinnerIcon } from '../feedback/Spinner.tsx';
import { buttonStyles, type ButtonSize, type ButtonVariant } from './button-styles.ts';

export interface ButtonProps extends Omit<AriaButtonProps, 'children' | 'className' | 'style'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  /** Icon before the label; replaced by a spinner while `isPending`. */
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  children: ReactNode;
  /** Layout only (margins, width); appearance comes from `variant` and `size`. */
  className?: string;
}

/**
 * Primary action component. Pending state keeps the label visible, blocks presses and is
 * announced by React Aria; disabled is reserved for actions that are truly unavailable.
 */
export function Button({
  variant,
  size,
  fullWidth,
  leadingIcon,
  trailingIcon,
  children,
  className,
  ...props
}: ButtonProps) {
  return (
    <AriaButton {...props} className={cx(buttonStyles({ variant, size, fullWidth }), className)}>
      {props.isPending ? <SpinnerIcon size={size === 'lg' ? 'md' : 'sm'} /> : leadingIcon}
      <span>{children}</span>
      {!props.isPending && trailingIcon}
    </AriaButton>
  );
}
