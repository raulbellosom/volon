import type { ReactNode } from 'react';
import {
  SelectionIndicator,
  Tab as AriaTab,
  TabList as AriaTabList,
  TabPanel as AriaTabPanel,
  Tabs as AriaTabs,
  type TabListProps as AriaTabListProps,
  type TabPanelProps as AriaTabPanelProps,
  type TabProps as AriaTabProps,
  type TabsProps as AriaTabsProps,
} from 'react-aria-components';
import { cx, withStyles } from '../../utils/cx.ts';

export interface TabsProps extends Omit<AriaTabsProps, 'className'> {
  className?: string;
}

/** Switches between views of the same context. Arrow keys move between tabs. */
export function Tabs({ className, ...props }: TabsProps) {
  return <AriaTabs {...props} className={withStyles(className, () => 'flex flex-col gap-4')} />;
}

export interface TabListProps<T extends object> extends Omit<AriaTabListProps<T>, 'className'> {
  className?: string;
}

/** Scrolls horizontally on narrow screens instead of wrapping. */
export function TabList<T extends object>({ className, ...props }: TabListProps<T>) {
  return (
    <AriaTabList
      {...props}
      className={withStyles(className, () =>
        cx('flex gap-1 overflow-x-auto border-b border-border-subtle [scrollbar-width:none]', '[&::-webkit-scrollbar]:hidden'))}
    />
  );
}

export interface TabProps extends Omit<AriaTabProps, 'children' | 'className'> {
  children: ReactNode;
  icon?: ReactNode;
  /** Small count after the label (e.g. pending items). */
  count?: number;
  className?: string;
}

const TAB = cx(
  'group relative flex h-11 shrink-0 cursor-pointer select-none items-center gap-2 px-3 text-sm font-semibold whitespace-nowrap',
  'text-text-secondary outline-none transition-colors duration-(--duration-fast)',
  'data-hovered:text-text-primary data-selected:text-text-primary data-focus-visible:focus-ring data-focus-visible:rounded-sm',
  'data-disabled:cursor-not-allowed data-disabled:text-text-disabled [&_svg]:size-4.5',
);

/** The selected tab gets a rounded «ribbon» bar that slides between tabs. */
export function Tab({ children, icon, count, className, ...props }: TabProps) {
  return (
    <AriaTab {...props} className={withStyles(className, () => TAB)}>
      {icon && <span aria-hidden="true" className="flex">{icon}</span>}
      {children}
      {count !== undefined && (
        <>
          <span aria-hidden="true" className="rounded-full bg-surface-sunken px-1.5 text-xs font-bold tabular-nums group-data-selected:bg-selection-fill group-data-selected:text-selection-mark">
            {count}
          </span>
          <span className="sr-only">, {count}</span>
        </>
      )}
      <SelectionIndicator className="absolute inset-x-2 -bottom-px h-[3px] rounded-full bg-action-primary transition-[translate,width] duration-(--duration-base) ease-standard" />
    </AriaTab>
  );
}

export interface TabPanelProps extends Omit<AriaTabPanelProps, 'className'> {
  className?: string;
}

export function TabPanel({ className, ...props }: TabPanelProps) {
  return <AriaTabPanel {...props} className={withStyles(className, () => 'outline-none data-focus-visible:focus-ring rounded-md')} />;
}
