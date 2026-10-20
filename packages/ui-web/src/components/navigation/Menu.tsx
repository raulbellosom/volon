import type { ReactNode } from 'react';
import {
  Header,
  Menu as AriaMenu,
  MenuItem as AriaMenuItem,
  MenuSection as AriaMenuSection,
  Separator,
  Text,
  type MenuItemProps as AriaMenuItemProps,
  type MenuProps as AriaMenuProps,
} from 'react-aria-components';
import { cx, withStyles } from '../../utils/cx.ts';
import { Popover, type PopoverProps } from '../overlays/Popover.tsx';

export { MenuTrigger } from 'react-aria-components';

export interface MenuProps<T extends object> extends Omit<AriaMenuProps<T>, 'className'> {
  placement?: PopoverProps['placement'];
  className?: string;
}

/**
 * Action list opened from a button (place both inside `MenuTrigger`). Never wider than the screen
 * minus a small margin, so long descriptions wrap instead of pushing the page sideways.
 */
export function Menu<T extends object>({ placement = 'bottom end', className, ...props }: MenuProps<T>) {
  return (
    <Popover placement={placement} className="min-w-56 max-w-[min(22rem,calc(100vw-1.5rem))]">
      <AriaMenu {...props} className={withStyles(className, () => 'max-h-[inherit] overflow-auto outline-none')} />
    </Popover>
  );
}

export interface MenuItemProps extends Omit<AriaMenuItemProps, 'children' | 'className'> {
  children: ReactNode;
  icon?: ReactNode;
  description?: ReactNode;
  /** Keyboard hint shown at the end, e.g. «⌘K». Purely visual. */
  shortcut?: string;
  /** Destructive actions are tinted red; still confirm them with an AlertDialog. */
  tone?: 'default' | 'danger';
  className?: string;
}

export function MenuItem({ children, icon, description, shortcut, tone = 'default', className, ...props }: MenuItemProps) {
  const textValue = props.textValue ?? (typeof children === 'string' ? children : undefined);
  return (
    <AriaMenuItem
      {...props}
      {...(textValue ? { textValue } : {})}
      className={withStyles(className, () =>
        cx(
          'group flex cursor-pointer select-none items-center gap-3 rounded-sm px-3 py-2.5 text-md outline-none',
          tone === 'danger' ? 'text-feedback-danger-fg data-focused:bg-feedback-danger-bg' : 'text-text-primary data-focused:bg-surface-hover',
          'data-pressed:bg-surface-selected data-disabled:cursor-not-allowed data-disabled:text-text-disabled',
        ))}
    >
      {icon && <span aria-hidden="true" className={cx('flex [&_svg]:size-5', tone === 'default' && 'text-text-secondary')}>{icon}</span>}
      <span className="flex min-w-0 flex-1 flex-col">
        <Text slot="label" className="truncate">{children}</Text>
        {description && <Text slot="description" className="text-sm break-words text-text-secondary">{description}</Text>}
      </span>
      {shortcut && <kbd className="font-sans text-xs text-text-secondary">{shortcut}</kbd>}
    </AriaMenuItem>
  );
}

export function MenuSection({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <AriaMenuSection className="py-1 first:pt-0 last:pb-0">
      {title && <Header className="px-3 pt-2 pb-1 text-xs font-bold uppercase tracking-overline text-text-secondary">{title}</Header>}
      {children}
    </AriaMenuSection>
  );
}

export function MenuSeparator() {
  return <Separator className="my-1 border-t border-border-subtle" />;
}
