import { ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link as AriaLink, type LinkProps as AriaLinkProps } from 'react-aria-components';
import { cx, withStyles } from '../../utils/cx.ts';
import { buttonStyles, type ButtonSize, type ButtonVariant } from './button-styles.ts';

export interface LinkProps extends Omit<AriaLinkProps, 'children' | 'className'> {
  children: ReactNode;
  /** Opens in a new tab with an icon and an announced warning. */
  external?: boolean;
  /** `standalone` for links outside running text (bolder, underline on hover only). */
  variant?: 'inline' | 'standalone';
  className?: string;
}

const LINK = {
  inline: 'underline decoration-[1.5px] underline-offset-[3px] decoration-current/40 data-hovered:decoration-current',
  standalone: 'font-semibold no-underline data-hovered:underline underline-offset-[3px]',
} as const;

function externalProps(external: boolean | undefined) {
  return external ? { target: '_blank', rel: 'noopener noreferrer' } : {};
}

/** Navigates to another page or place. For actions that change data use Button instead. */
export function Link({ children, external, variant = 'inline', className, ...props }: LinkProps) {
  return (
    <AriaLink
      {...externalProps(external)}
      {...props}
      className={withStyles(className, () =>
        cx(
          'inline-flex items-center gap-0.5 rounded-xs text-text-link outline-none transition-colors',
          'data-focus-visible:focus-ring data-disabled:cursor-not-allowed data-disabled:text-text-disabled',
          LINK[variant],
        ))}
    >
      {children}
      {external && (
        <>
          <ArrowUpRight aria-hidden="true" className="size-[1em] shrink-0" />
          <span className="sr-only"> (se abre en otra pestaña)</span>
        </>
      )}
    </AriaLink>
  );
}

export interface LinkButtonProps extends Omit<AriaLinkProps, 'children' | 'className'> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  external?: boolean;
  className?: string;
}

/** Navigation that should look like a button (e.g. «Ver todos los envíos»). Keeps link semantics. */
export function LinkButton({ children, variant = 'secondary', size, leadingIcon, trailingIcon, external, className, ...props }: LinkButtonProps) {
  return (
    <AriaLink {...externalProps(external)} {...props} className={cx(buttonStyles({ variant, size }), className)}>
      {leadingIcon}
      <span>{children}</span>
      {trailingIcon}
      {external && <span className="sr-only"> (se abre en otra pestaña)</span>}
    </AriaLink>
  );
}
