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
  'group relative inline-flex cursor-pointer items-start gap-3 text-md text-text-primary outline-none',
  'data-disabled:cursor-not-allowed data-disabled:text-text-disabled',
);

const BOX = cx(
  'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-xs border-(length:--border-control) border-border bg-surface',
  'text-text-on-action transition-[background-color,border-color,transform] duration-(--duration-fast) ease-standard',
  'group-data-hovered:border-text-secondary group-data-pressed:scale-90',
  'group-data-selected:border-action-primary group-data-selected:bg-action-primary',
  'group-data-indeterminate:border-action-primary group-data-indeterminate:bg-action-primary',
  'group-data-invalid:border-feedback-danger-fg group-data-focus-visible:focus-ring',
  'group-data-disabled:border-border-subtle group-data-disabled:bg-surface-disabled group-data-disabled:text-text-disabled',
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
  children: ReactNode;
  className?: string;
}

/** Group of related checkboxes sharing a label, help text and validation. */
export function CheckboxGroup({ label, description, errorMessage, children, className, ...props }: CheckboxGroupProps) {
  return (
    <AriaCheckboxGroup {...props} className={withStyles(className, () => fieldStyles.root)}>
      <FieldChrome label={label} description={description} errorMessage={errorMessage} isRequired={props.isRequired}>
        <div className="flex flex-col gap-3 py-1">{children}</div>
      </FieldChrome>
    </AriaCheckboxGroup>
  );
}
