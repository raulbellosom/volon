import type { ReactNode } from 'react';
import { cx } from '../../utils/cx.ts';

export interface DescriptionItem {
  /** Stable key; defaults to the term when it is a string. */
  id?: string;
  term: ReactNode;
  description: ReactNode;
  icon?: ReactNode;
}

export type DescriptionLayout = 'stacked' | 'inline' | 'grid';

const LAYOUTS: Record<DescriptionLayout, { list: string; row: string }> = {
  /** Term above value: narrow columns and phones. */
  stacked: { list: 'flex flex-col gap-4', row: 'flex flex-col gap-0.5' },
  /** Term left, value right with dividers: details panels. Stacks on phones. */
  inline: {
    list: 'flex flex-col divide-y divide-border-subtle',
    row: 'grid gap-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-[minmax(8rem,1fr)_2fr] sm:gap-4',
  },
  /** Two or three columns of facts: summaries. */
  grid: { list: 'grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3', row: 'flex flex-col gap-0.5' },
};

export interface DescriptionListProps {
  items: readonly DescriptionItem[];
  layout?: DescriptionLayout;
  className?: string;
}

/** Read-only key–value details (delivery data, branch info) using `<dl>` semantics. */
export function DescriptionList({ items, layout = 'inline', className }: DescriptionListProps) {
  const styles = LAYOUTS[layout];
  return (
    <dl className={cx(styles.list, className)}>
      {items.map((item, index) => (
        <div key={item.id ?? (typeof item.term === 'string' ? item.term : index)} className={styles.row}>
          <dt className="flex items-center gap-2 text-sm text-text-secondary [&_svg]:size-4 [&_svg]:shrink-0">
            {item.icon && <span aria-hidden="true" className="flex">{item.icon}</span>}
            {item.term}
          </dt>
          <dd className="min-w-0 text-md font-semibold break-words text-text-primary">{item.description}</dd>
        </div>
      ))}
    </dl>
  );
}
