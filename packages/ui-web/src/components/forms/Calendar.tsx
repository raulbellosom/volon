import type { DateValue } from '@internationalized/date';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Button as AriaButton,
  Calendar as AriaCalendar,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  Heading,
  type CalendarProps as AriaCalendarProps,
} from 'react-aria-components';
import { cx, withStyles } from '../../utils/cx.ts';

const NAV = cx(
  'flex size-9 cursor-pointer items-center justify-center rounded-full text-text-primary outline-none',
  'data-hovered:bg-surface-hover data-focus-visible:focus-ring data-disabled:cursor-not-allowed data-disabled:opacity-40 [&_svg]:size-5',
);

const CELL = cx(
  'flex size-10 cursor-pointer items-center justify-center rounded-full text-sm font-semibold tabular-nums text-text-primary outline-none',
  'transition-colors duration-(--duration-instant) data-hovered:bg-surface-hover data-pressed:bg-surface-selected',
  'data-focus-visible:focus-ring',
  'data-selected:bg-selection-fill data-selected:text-selection-mark',
  '[&[data-today]:not([data-selected])]:ring-2 [&[data-today]:not([data-selected])]:ring-inset [&[data-today]:not([data-selected])]:ring-action-primary',
  'data-outside-month:hidden data-unavailable:cursor-not-allowed data-unavailable:text-text-disabled data-unavailable:line-through',
  'data-disabled:cursor-not-allowed data-disabled:text-text-disabled',
);

export interface CalendarProps<T extends DateValue> extends Omit<AriaCalendarProps<T>, 'className'> {
  className?: string;
}

/**
 * Month grid with keyboard navigation (arrows, PageUp/PageDown for months). Today is
 * ringed; the selected day uses the brand selection pair. Used inside DatePicker.
 */
export function Calendar<T extends DateValue>({ className, ...props }: CalendarProps<T>) {
  return (
    <AriaCalendar {...props} className={withStyles(className, () => 'w-fit text-text-primary')}>
      <header className="mb-2 flex items-center justify-between gap-2 px-1">
        <AriaButton slot="previous" className={NAV}><ChevronLeft aria-hidden="true" /></AriaButton>
        <Heading className="text-md font-bold first-letter:uppercase" />
        <AriaButton slot="next" className={NAV}><ChevronRight aria-hidden="true" /></AriaButton>
      </header>
      <CalendarGrid className="border-separate border-spacing-0.5">
        <CalendarGridHeader>
          {(day) => <CalendarHeaderCell className="pb-1 text-xs font-bold uppercase text-text-secondary">{day}</CalendarHeaderCell>}
        </CalendarGridHeader>
        <CalendarGridBody>{(date) => <CalendarCell date={date} className={CELL} />}</CalendarGridBody>
      </CalendarGrid>
    </AriaCalendar>
  );
}
