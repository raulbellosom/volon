import type { ReactNode } from 'react';
import {
  Radio as AriaRadio,
  RadioGroup as AriaRadioGroup,
  type RadioGroupProps as AriaRadioGroupProps,
  type RadioProps as AriaRadioProps,
} from 'react-aria-components';
import { cx, withStyles } from '../../utils/cx.ts';
import { CARD_GRID, selectionRowStyles } from './Checkbox.tsx';
import { FieldChrome, type FieldErrorMessage } from './FieldParts.tsx';
import { fieldStyles } from './field-styles.ts';

/** Selected: brand-filled circle with a lime center (dark: lime circle, deep blue center). */
const DOT = cx(
  'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-(length:--border-control) border-border bg-surface',
  'transition-[background-color,border-color,transform] duration-(--duration-fast) ease-spring',
  'group-data-hovered:border-text-secondary group-data-pressed:scale-90',
  'group-data-selected:border-selection-fill group-data-selected:bg-selection-fill',
  'group-data-invalid:border-feedback-danger-fg group-data-focus-visible:focus-ring',
  'group-data-disabled:opacity-40 group-data-disabled:scale-100',
);

const CENTER = cx(
  'size-2 scale-0 rounded-full bg-selection-mark transition-transform duration-(--duration-base) ease-spring',
  'group-data-selected:scale-100',
);

export interface RadioProps extends Omit<AriaRadioProps, 'children' | 'className'> {
  children: ReactNode;
  className?: string;
}

export function Radio({ children, className, ...props }: RadioProps) {
  return (
    <AriaRadio {...props} className={withStyles(className, () => selectionRowStyles)}>
      <span aria-hidden="true" className={DOT}><span className={CENTER} /></span>
      <span>{children}</span>
    </AriaRadio>
  );
}

export interface RadioGroupProps extends Omit<AriaRadioGroupProps, 'children' | 'className'> {
  label?: ReactNode;
  description?: ReactNode;
  errorMessage?: FieldErrorMessage;
  /** `cards` lays out RadioCard children in a responsive grid. */
  layout?: 'list' | 'cards';
  children: ReactNode;
  className?: string;
}

/** Single choice among few visible options; arrow keys move the selection. */
export function RadioGroup({ label, description, errorMessage, layout = 'list', children, className, ...props }: RadioGroupProps) {
  return (
    <AriaRadioGroup {...props} className={withStyles(className, () => fieldStyles.root)}>
      <FieldChrome label={label} description={description} errorMessage={errorMessage} isRequired={props.isRequired}>
        <div className={layout === 'cards' ? CARD_GRID : cx('flex', props.orientation === 'horizontal' ? 'flex-row flex-wrap gap-x-6' : 'flex-col')}>
          {children}
        </div>
      </FieldChrome>
    </AriaRadioGroup>
  );
}
