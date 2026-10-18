import type { ReactNode } from 'react';
import {
  Radio as AriaRadio,
  RadioGroup as AriaRadioGroup,
  type RadioGroupProps as AriaRadioGroupProps,
  type RadioProps as AriaRadioProps,
} from 'react-aria-components';
import { cx, withStyles } from '../../utils/cx.ts';
import { selectionRowStyles } from './Checkbox.tsx';
import { FieldChrome, type FieldErrorMessage } from './FieldParts.tsx';
import { fieldStyles } from './field-styles.ts';

const DOT = cx(
  'mt-0.5 size-5 shrink-0 rounded-full border-(length:--border-control) border-border bg-surface',
  'transition-[border-width,border-color,transform] duration-(--duration-fast) ease-spring',
  'group-data-hovered:border-text-secondary group-data-pressed:scale-90',
  'group-data-selected:border-[6px] group-data-selected:border-action-primary',
  'group-data-invalid:border-feedback-danger-fg group-data-focus-visible:focus-ring',
  'group-data-disabled:border-border-subtle group-data-disabled:bg-surface-disabled',
);

export interface RadioProps extends Omit<AriaRadioProps, 'children' | 'className'> {
  children: ReactNode;
  className?: string;
}

export function Radio({ children, className, ...props }: RadioProps) {
  return (
    <AriaRadio {...props} className={withStyles(className, () => selectionRowStyles)}>
      <span aria-hidden="true" className={DOT} />
      <span>{children}</span>
    </AriaRadio>
  );
}

export interface RadioGroupProps extends Omit<AriaRadioGroupProps, 'children' | 'className'> {
  label?: ReactNode;
  description?: ReactNode;
  errorMessage?: FieldErrorMessage;
  children: ReactNode;
  className?: string;
}

/** Single choice among few visible options; arrow keys move the selection. */
export function RadioGroup({ label, description, errorMessage, children, className, ...props }: RadioGroupProps) {
  return (
    <AriaRadioGroup {...props} className={withStyles(className, () => fieldStyles.root)}>
      <FieldChrome label={label} description={description} errorMessage={errorMessage} isRequired={props.isRequired}>
        <div className={cx('flex gap-3 py-1', props.orientation === 'horizontal' ? 'flex-row flex-wrap gap-x-6' : 'flex-col')}>
          {children}
        </div>
      </FieldChrome>
    </AriaRadioGroup>
  );
}
