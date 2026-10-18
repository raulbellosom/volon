import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { ListBoxItem as AriaListBoxItem, Text, type ListBoxItemProps as AriaListBoxItemProps } from 'react-aria-components';
import { cx, withStyles } from '../../utils/cx.ts';

export const optionStyles = cx(
  'group flex cursor-pointer select-none items-center gap-3 rounded-sm px-3 py-2.5 text-md text-text-primary outline-none',
  'data-focused:bg-surface-hover data-pressed:bg-surface-selected data-selected:font-semibold',
  'data-disabled:cursor-not-allowed data-disabled:text-text-disabled',
);

export interface OptionProps extends Omit<AriaListBoxItemProps, 'children' | 'className'> {
  children: ReactNode;
  /** Secondary line, e.g. an address under a branch name. */
  description?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

/** Option used by Select and ComboBox; shows a check when selected. */
export function Option({ children, description, icon, className, ...props }: OptionProps) {
  const textValue = props.textValue ?? (typeof children === 'string' ? children : undefined);
  return (
    <AriaListBoxItem {...props} {...(textValue ? { textValue } : {})} className={withStyles(className, () => optionStyles)}>
      {({ isSelected }) => (
        <>
          {icon && <span aria-hidden="true" className="text-text-secondary [&_svg]:size-5">{icon}</span>}
          <span className="flex min-w-0 flex-1 flex-col">
            <Text slot="label" className="truncate">{children}</Text>
            {description && <Text slot="description" className="truncate text-sm font-normal text-text-secondary">{description}</Text>}
          </span>
          <Check aria-hidden="true" className={cx('size-4 shrink-0 text-text-link', !isSelected && 'invisible')} strokeWidth={2.5} />
        </>
      )}
    </AriaListBoxItem>
  );
}
