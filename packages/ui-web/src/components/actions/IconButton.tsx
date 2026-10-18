import type { ReactNode } from 'react';
import { Button as AriaButton, type ButtonProps as AriaButtonProps } from 'react-aria-components';
import { cx } from '../../utils/cx.ts';
import { SpinnerIcon } from '../feedback/Spinner.tsx';
import { buttonStyles, type ButtonSize, type ButtonVariant } from './button-styles.ts';

export interface IconButtonProps extends Omit<AriaButtonProps, 'children' | 'className' | 'style' | 'aria-label'> {
  /** Required accessible name, since the button has no visible text. */
  label: string;
  icon: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}

/** Square, pill-rounded button for a single icon; defaults to the quiet ghost variant. */
export function IconButton({ label, icon, variant = 'ghost', size, className, ...props }: IconButtonProps) {
  return (
    <AriaButton
      {...props}
      aria-label={label}
      className={cx(buttonStyles({ variant, size, iconOnly: true }), className)}
    >
      {props.isPending ? <SpinnerIcon size={size === 'lg' ? 'md' : 'sm'} /> : icon}
    </AriaButton>
  );
}
