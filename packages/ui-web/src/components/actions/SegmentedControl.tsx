import type { Key, ReactNode } from 'react';
import { SelectionIndicator, ToggleButton, ToggleButtonGroup } from 'react-aria-components';
import { cx } from '../../utils/cx.ts';

export interface SegmentedItem<K extends string> {
  id: K;
  label: string;
  icon?: ReactNode;
}

export interface SegmentedControlProps<K extends string> {
  items: readonly SegmentedItem<K>[];
  selectedKey: K;
  onSelectionChange: (key: K) => void;
  /** Names the group for assistive tech («Tema», «Periodo»). */
  'aria-label': string;
  size?: 'sm' | 'md';
  /** Shows only icons; labels stay as accessible names. */
  iconOnly?: boolean;
  isDisabled?: boolean;
  className?: string;
}

const ITEM = cx(
  'relative flex flex-1 cursor-pointer select-none items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap',
  'text-text-secondary outline-none transition-colors duration-(--duration-fast)',
  'data-hovered:text-text-primary data-selected:text-text-primary data-focus-visible:focus-ring',
  'data-disabled:cursor-not-allowed data-disabled:text-text-disabled',
);

const SIZES = {
  sm: { item: 'h-8 px-3 text-sm [&_svg]:size-4', icon: 'size-8 [&_svg]:size-4' },
  md: { item: 'h-10 px-4 text-sm [&_svg]:size-4.5', icon: 'size-10 [&_svg]:size-5' },
} as const;

/**
 * Exclusive choice among 2–5 short options that apply immediately (view modes, theme).
 * The selected pill slides between options; with reduced motion it simply jumps.
 */
export function SegmentedControl<K extends string>({
  items,
  selectedKey,
  onSelectionChange,
  size = 'md',
  iconOnly,
  isDisabled,
  className,
  ...props
}: SegmentedControlProps<K>) {
  return (
    <ToggleButtonGroup
      aria-label={props['aria-label']}
      selectionMode="single"
      disallowEmptySelection
      selectedKeys={[selectedKey]}
      onSelectionChange={(keys: Set<Key>) => {
        const [next] = [...keys];
        if (next !== undefined) onSelectionChange(String(next) as K);
      }}
      {...(isDisabled ? { isDisabled } : {})}
      className={cx('inline-flex w-fit gap-1 rounded-full bg-surface-sunken p-1', className)}
    >
      {items.map((item) => (
        <ToggleButton
          key={item.id}
          id={item.id}
          {...(iconOnly ? { 'aria-label': item.label } : {})}
          className={cx(ITEM, iconOnly ? SIZES[size].icon : SIZES[size].item)}
        >
          <SelectionIndicator className="absolute inset-0 rounded-full bg-surface shadow-1 transition-[translate,width] duration-(--duration-base) ease-standard" />
          <span className="relative flex items-center gap-2">
            {item.icon && <span aria-hidden="true" className="flex">{item.icon}</span>}
            {!iconOnly && item.label}
          </span>
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
