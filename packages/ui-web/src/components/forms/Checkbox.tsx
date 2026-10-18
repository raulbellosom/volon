import { Check, Minus } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  Checkbox as AriaCheckbox,
  CheckboxGroup as AriaCheckboxGroup,
  type CheckboxGroupProps as AriaCheckboxGroupProps,
  type CheckboxProps as AriaCheckboxProps,
} from 'react-aria-components';
import { cx, withStyles } from '../../utils/cx.ts';
import { FieldChrome, type FieldErrorMessage } from './FieldParts.tsx';
import { fieldStyles } from './field-styles.ts';

/** Shared by checkbox and radio rows: label text, alignment and disabled color. */
export const selectionRowStyles = cx(
  'group relative inline-flex min-h-11 cursor-pointer items-start gap-3 py-2.5 text-md text-text-primary outline-none',
  'data-disabled:cursor-not-allowed data-disabled:text-text-disabled',
);

/** Responsive grid for RadioCard / CheckboxCard groups: one column on phones, two from tablet. */
export const CARD_GRID = 'grid gap-3 pt-1 sm:grid-cols-2';

const BOX = cx(
  'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-xs border-(length:--border-control) border-border bg-surface',
  'text-selection-mark transition-[background-color,border-color,transform] duration-(--duration-fast) ease-spring',
  'group-data-hovered:border-text-secondary group-data-pressed:scale-90',
  'group-data-selected:border-selection-fill group-data-selected:bg-selection-fill',
  'group-data-indeterminate:border-selection-fill group-data-indeterminate:bg-selection-fill',
  'group-data-invalid:border-feedback-danger-fg group-data-focus-visible:focus-ring',
  // Opacity keeps the selected state readable but clearly inactive, whatever the selection.
  'group-data-disabled:opacity-40 group-data-disabled:scale-100',
);

export interface CheckboxProps extends Omit<AriaCheckboxProps, 'children' | 'className'> {
  children?: ReactNode;
  className?: string;
}

/** Checkbox with label; supports indeterminate for «select all» patterns. */
export function Checkbox({ children, className, ...props }: CheckboxProps) {
  return (
    <AriaCheckbox {...props} className={withStyles(className, () => selectionRowStyles)}>
      {({ isSelected, isIndeterminate }) => (
        <>
          <span aria-hidden="true" className={BOX}>
            {isIndeterminate ? <Minus className="size-3.5" strokeWidth={3} /> : isSelected && <Check className="size-3.5" strokeWidth={3} />}
          </span>
          {children && <span>{children}</span>}
        </>
      )}
    </AriaCheckbox>
  );
}

export interface CheckboxGroupProps extends Omit<AriaCheckboxGroupProps, 'children' | 'className'> {
  label?: ReactNode;
  description?: ReactNode;
  errorMessage?: FieldErrorMessage;
  /** `cards` lays out CheckboxCard children in a responsive grid. */
  layout?: 'list' | 'cards';
  children: ReactNode;
  className?: string;
}

/** Group of related checkboxes sharing a label, help text and validation. */
export function CheckboxGroup({ label, description, errorMessage, layout = 'list', children, className, ...props }: CheckboxGroupProps) {
  return (
    <AriaCheckboxGroup {...props} className={withStyles(className, () => fieldStyles.root)}>
      <FieldChrome label={label} description={description} errorMessage={errorMessage} isRequired={props.isRequired}>
        <div className={layout === 'cards' ? CARD_GRID : 'flex flex-col'}>{children}</div>
      </FieldChrome>
    </AriaCheckboxGroup>
  );
}
