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
import { controlStyles, fieldStyles, type ControlSize } from './field-styles.ts';

export interface TextFieldProps extends Omit<AriaTextFieldProps, 'children' | 'className'> {
  label?: ReactNode;
  description?: ReactNode;
  errorMessage?: FieldErrorMessage;
  placeholder?: string;
  size?: ControlSize;
  /** Decorative icon inside the start of the control. */
  leadingIcon?: ReactNode;
  /** Interactive or decorative content at the end of the control (e.g. a toggle). */
  trailing?: ReactNode;
  /** Renders a resizable multi-line text area instead of a single-line input. */
  multiline?: boolean;
  rows?: number;
  className?: string;
}

const ICON_SLOT = 'pointer-events-none absolute inset-y-0 start-3.5 flex items-center text-text-secondary [&_svg]:size-5';

/** Labelled text input with help, validation and optional icons. */
export function TextField({
  label,
  description,
  errorMessage,
  placeholder,
  size,
  leadingIcon,
  trailing,
  multiline,
  rows,
  className,
  ...props
}: TextFieldProps) {
  return (
    <AriaTextField {...props} className={withStyles(className, () => fieldStyles.root)}>
      <FieldChrome label={label} description={description} errorMessage={errorMessage} isRequired={props.isRequired}>
        {multiline ? (
          <TextArea {...defined({ placeholder })} rows={rows ?? 4} className={controlStyles({ multiline: true })} />
        ) : (
          <div className="relative">
            {leadingIcon && <span aria-hidden="true" className={ICON_SLOT}>{leadingIcon}</span>}
            <Input
              {...defined({ placeholder })}
              className={cx(controlStyles({ size }), Boolean(leadingIcon) && 'ps-11', Boolean(trailing) && 'pe-12')}
            />
            {trailing && <span className="absolute inset-y-0 end-1 flex items-center">{trailing}</span>}
          </div>
        )}
      </FieldChrome>
    </AriaTextField>
  );
}
