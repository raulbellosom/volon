import { DateInput, DateSegment } from 'react-aria-components';
import { cx } from '../../utils/cx.ts';

const SEGMENT = cx(
  'rounded-xs px-0.5 tabular-nums text-text-primary outline-none caret-transparent',
  'data-placeholder:text-text-secondary data-[type=literal]:px-0 data-[type=literal]:text-text-secondary',
  'focus:bg-action-primary focus:text-text-on-action data-disabled:text-text-disabled',
);

/** Editable date/time segments shared by DatePicker and TimeField. */
export function DateSegments() {
  return (
    <DateInput className="flex min-w-0 flex-1 items-center py-2 outline-none">
      {(segment) => <DateSegment segment={segment} className={SEGMENT} />}
    </DateInput>
  );
}
