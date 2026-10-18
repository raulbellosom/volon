import { cx } from '../../utils/cx.ts';

const SHIMMER = cx(
  'bg-surface-sunken bg-size-[200%_100%] animate-shimmer',
  'bg-[linear-gradient(105deg,transparent_35%,var(--color-surface-hover)_50%,transparent_65%)]',
);

export interface SkeletonProps {
  shape?: 'rect' | 'circle' | 'text';
  /** Size utilities such as `h-24 w-full` or `size-10`. */
  className?: string;
}

/**
 * Placeholder that mirrors the layout being loaded. Decorative: mark the loading region
 * with `aria-busy` and provide a text status for assistive tech.
 */
export function Skeleton({ shape = 'rect', className }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        'block',
        SHIMMER,
        shape === 'circle' ? 'rounded-full' : shape === 'text' ? 'h-4 rounded-xs' : 'rounded-md',
        className,
      )}
    />
  );
}

/** Paragraph placeholder; the last line is shorter so it reads as text. */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <span aria-hidden="true" className={cx('flex flex-col gap-2', className)}>
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton key={index} shape="text" className={index === lines - 1 && lines > 1 ? 'w-3/5' : 'w-full'} />
      ))}
    </span>
  );
}
