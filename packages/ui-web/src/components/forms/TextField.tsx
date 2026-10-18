import type { ReactNode } from 'react';
import {
  Input,
  TextArea,
  TextField as AriaTextField,
  type TextFieldProps as AriaTextFieldProps,
} from 'react-aria-components';
import { cx, withStyles } from '../../utils/cx.ts';
import { defined } from '../../utils/defined.ts';
import { FieldChrome, type FieldErrorMessage } from './FieldParts.tsx';
import { bareInputStyles, controlBoxStyles, fieldIconStyles, fieldStyles, type ControlSize } from './field-styles.ts';

export interface TextFieldProps extends Omit<AriaTextFieldProps, 'children' | 'className'> {
  label?: ReactNode;
  description?: ReactNode;
  errorMessage?: FieldErrorMessage;
  placeholder?: string;
  size?: ControlSize;
  /**
   * Required by design: every field shows an icon so people recognize at a glance what
   * they are filling in (Mail for email, Phone for phone, MapPin for address…).
   */
  icon: ReactNode;
  /** Interactive or decorative content at the end of the control (e.g. a toggle or unit). */
  trailing?: ReactNode;
  /** Renders a resizable multi-line text area instead of a single-line input. */
  multiline?: boolean;
  rows?: number;
  className?: string;
}

/** Labelled text input with icon, help, validation and optional trailing content. */
export function TextField({
  label,
  description,
  errorMessage,
  placeholder,
  size = 'md',
  icon,
  trailing,
  multiline,
  rows,
  className,
  ...props
}: TextFieldProps) {
  return (
    <AriaTextField {...props} className={withStyles(className, () => fieldStyles.root)}>
      <FieldChrome label={label} description={description} errorMessage={errorMessage} isRequired={props.isRequired}>
        <div className={controlBoxStyles({ size, multiline: Boolean(multiline) })}>
          <span aria-hidden="true" className={fieldIconStyles(size)}>{icon}</span>
          {multiline ? (
            <TextArea {...defined({ placeholder })} rows={rows ?? 4} className={cx(bareInputStyles, 'resize-y py-1.5')} />
          ) : (
            <Input {...defined({ placeholder })} className={bareInputStyles} />
          )}
          {trailing && <span className="flex shrink-0 items-center text-text-secondary">{trailing}</span>}
        </div>
      </FieldChrome>
    </AriaTextField>
  );
}
