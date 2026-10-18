import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  Button as AriaButton,
  ComboBox as AriaComboBox,
  Input,
  ListBox,
  type ComboBoxProps as AriaComboBoxProps,
} from 'react-aria-components';
import { cx, withStyles } from '../../utils/cx.ts';
import { defined } from '../../utils/defined.ts';
import { Popover } from '../overlays/Popover.tsx';
import { FieldChrome, type FieldErrorMessage } from './FieldParts.tsx';
import { bareInputStyles, controlBoxStyles, fieldIconStyles, fieldStyles, type ControlSize } from './field-styles.ts';

export interface ComboBoxProps<T extends object> extends Omit<AriaComboBoxProps<T>, 'children' | 'className'> {
  label?: ReactNode;
  description?: ReactNode;
  errorMessage?: FieldErrorMessage;
  placeholder?: string;
  size?: ControlSize;
  /** Required by design (see TextField). */
  icon: ReactNode;
  items?: Iterable<T>;
  /** `Option` elements, or a render function when `items` is provided. */
  children: ReactNode | ((item: T) => ReactNode);
  /** Shown when typing filters out every option. */
  emptyMessage?: string;
  className?: string;
}

/**
 * Type to filter a long list (branches, colonias, products). Arrow keys open and move
 * through results; Enter selects; Escape restores the last value.
 */
export function ComboBox<T extends object>({
  label,
  description,
  errorMessage,
  placeholder,
  size = 'md',
  icon,
  items,
  children,
  emptyMessage = 'Sin resultados',
  className,
  ...props
}: ComboBoxProps<T>) {
  return (
    <AriaComboBox allowsEmptyCollection {...props} className={withStyles(className, () => fieldStyles.root)}>
      <FieldChrome label={label} description={description} errorMessage={errorMessage} isRequired={props.isRequired}>
        <div className={controlBoxStyles({ size })}>
          <span aria-hidden="true" className={fieldIconStyles(size)}>{icon}</span>
          <Input {...defined({ placeholder })} className={bareInputStyles} />
          <AriaButton
            className={cx(
              '-me-1 flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-sm text-text-secondary outline-none',
              'data-hovered:bg-surface-hover data-focus-visible:focus-ring',
            )}
          >
            <ChevronDown aria-hidden="true" className="size-5 transition-transform duration-(--duration-fast) group-data-open:rotate-180" />
          </AriaButton>
        </div>
        <Popover className="max-h-80">
          <ListBox
            {...defined({ items })}
            renderEmptyState={() => <p className="px-3 py-2.5 text-sm text-text-secondary">{emptyMessage}</p>}
            className="outline-none"
          >
            {children}
          </ListBox>
        </Popover>
      </FieldChrome>
    </AriaComboBox>
  );
}
