import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  Button as AriaButton,
  ListBox,
  Select as AriaSelect,
  SelectValue,
  type SelectProps as AriaSelectProps,
} from 'react-aria-components';
import { cx, withStyles } from '../../utils/cx.ts';
import { defined } from '../../utils/defined.ts';
import { Popover } from '../overlays/Popover.tsx';
import { FieldChrome, type FieldErrorMessage } from './FieldParts.tsx';
import { controlBoxStyles, fieldIconStyles, fieldStyles, type ControlSize } from './field-styles.ts';

export interface SelectProps<T extends object> extends Omit<AriaSelectProps<T>, 'children' | 'className'> {
  label?: ReactNode;
  description?: ReactNode;
  errorMessage?: FieldErrorMessage;
  size?: ControlSize;
  /** Required by design: tells people what the choice is about at a glance. */
  icon: ReactNode;
  items?: Iterable<T>;
  /** `Option` elements, or a render function when `items` is provided. */
  children: ReactNode | ((item: T) => ReactNode);
  className?: string;
}

/** Choose one option from a list that does not need typing to filter (use ComboBox for that). */
export function Select<T extends object>({
  label,
  description,
  errorMessage,
  size = 'md',
  icon,
  items,
  children,
  placeholder = 'Selecciona una opción',
  className,
  ...props
}: SelectProps<T>) {
  return (
    <AriaSelect {...props} placeholder={placeholder} className={withStyles(className, () => fieldStyles.root)}>
      <FieldChrome label={label} description={description} errorMessage={errorMessage} isRequired={props.isRequired}>
        <AriaButton className={cx(controlBoxStyles({ size }), 'cursor-pointer text-start outline-none')}>
          <span aria-hidden="true" className={fieldIconStyles(size)}>{icon}</span>
          {/* Only the selected text: option descriptions and check marks stay in the list. */}
          <SelectValue className="min-w-0 flex-1 truncate leading-normal data-placeholder:text-text-secondary">
            {({ selectedText, isPlaceholder }) => (isPlaceholder ? placeholder : selectedText)}
          </SelectValue>
          <ChevronDown
            aria-hidden="true"
            className="size-5 shrink-0 text-text-secondary transition-transform duration-(--duration-fast) group-data-open:rotate-180"
          />
        </AriaButton>
        <Popover className="max-h-80">
          <ListBox {...defined({ items })} className="outline-none">{children}</ListBox>
        </Popover>
      </FieldChrome>
    </AriaSelect>
  );
}
