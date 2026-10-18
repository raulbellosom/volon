import type { TimeValue } from 'react-aria-components';
import { Clock } from 'lucide-react';
import type { ReactNode } from 'react';
import { TimeField as AriaTimeField, type TimeFieldProps as AriaTimeFieldProps } from 'react-aria-components';
import { withStyles } from '../../utils/cx.ts';
import { DateSegments } from './date-segment.tsx';
import { FieldChrome, type FieldErrorMessage } from './FieldParts.tsx';
import { controlBoxStyles, fieldIconStyles, fieldStyles, type ControlSize } from './field-styles.ts';

export interface TimeFieldProps<T extends TimeValue> extends Omit<AriaTimeFieldProps<T>, 'children' | 'className'> {
  label?: ReactNode;
  description?: ReactNode;
  errorMessage?: FieldErrorMessage;
  size?: ControlSize;
  /** Defaults to a clock. */
  icon?: ReactNode;
  className?: string;
}

/** Time entry by segments (hour, minute, AM/PM per locale); ↑/↓ change the focused segment. */
export function TimeField<T extends TimeValue>({
  label,
  description,
  errorMessage,
  size = 'md',
  icon = <Clock />,
  className,
  ...props
}: TimeFieldProps<T>) {
  return (
    <AriaTimeField {...props} className={withStyles(className, () => fieldStyles.root)}>
      <FieldChrome label={label} description={description} errorMessage={errorMessage} isRequired={props.isRequired}>
        <div className={controlBoxStyles({ size })}>
          <span aria-hidden="true" className={fieldIconStyles(size)}>{icon}</span>
          <DateSegments />
        </div>
      </FieldChrome>
    </AriaTimeField>
  );
}
