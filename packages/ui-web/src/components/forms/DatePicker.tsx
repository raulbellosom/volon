import type { DateValue } from '@internationalized/date';
import { CalendarDays } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  Button as AriaButton,
  DatePicker as AriaDatePicker,
  Dialog as AriaDialog,
  Group,
  type DatePickerProps as AriaDatePickerProps,
} from 'react-aria-components';
import { cx, withStyles } from '../../utils/cx.ts';
import { Popover } from '../overlays/Popover.tsx';
import { Calendar } from './Calendar.tsx';
import { DateSegments } from './date-segment.tsx';
import { FieldChrome, type FieldErrorMessage } from './FieldParts.tsx';
import { controlBoxStyles, fieldIconStyles, fieldStyles, type ControlSize } from './field-styles.ts';

export interface DatePickerProps<T extends DateValue> extends Omit<AriaDatePickerProps<T>, 'children' | 'className'> {
  label?: ReactNode;
  description?: ReactNode;
  errorMessage?: FieldErrorMessage;
  size?: ControlSize;
  /** Defaults to a calendar; required-icon rule still holds. */
  icon?: ReactNode;
  className?: string;
}

/**
 * Date entry: type each segment (day, month, year) or pick from the calendar. Order and
 * separators follow the app locale (es-MX: dd/mm/aaaa). Values are `@internationalized/date`.
 */
export function DatePicker<T extends DateValue>({
  label,
  description,
  errorMessage,
  size = 'md',
  icon = <CalendarDays />,
  className,
  ...props
}: DatePickerProps<T>) {
  return (
    <AriaDatePicker {...props} className={withStyles(className, () => fieldStyles.root)}>
      <FieldChrome label={label} description={description} errorMessage={errorMessage} isRequired={props.isRequired}>
        <Group className={controlBoxStyles({ size })}>
          <span aria-hidden="true" className={fieldIconStyles(size)}>{icon}</span>
          <DateSegments />
          <AriaButton
            // Accessible name must contain the visible text (WCAG 2.5.3).
            aria-label="Elegir fecha en el calendario"
            className={cx(
              '-me-1 flex h-8 shrink-0 cursor-pointer items-center gap-1 rounded-sm px-2 text-sm font-semibold text-text-link outline-none',
              'data-hovered:bg-surface-hover data-focus-visible:focus-ring',
            )}
          >
            Elegir
          </AriaButton>
        </Group>
        <Popover placement="bottom start" className="p-3">
          <AriaDialog className="outline-none">
            <Calendar />
          </AriaDialog>
        </Popover>
      </FieldChrome>
    </AriaDatePicker>
  );
}
