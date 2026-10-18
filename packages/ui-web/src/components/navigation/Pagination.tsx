import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button as AriaButton } from 'react-aria-components';
import { cx } from '../../utils/cx.ts';
import { IconButton } from '../actions/IconButton.tsx';

export type PageItem = number | 'ellipsis-start' | 'ellipsis-end';

/** Page numbers to show around the current page, always keeping first and last. */
export function pageItems(page: number, pageCount: number, siblings = 1): PageItem[] {
  if (pageCount <= 5 + siblings * 2) return Array.from({ length: pageCount }, (_, index) => index + 1);
  const start = Math.max(2, page - siblings);
  const end = Math.min(pageCount - 1, page + siblings);
  const middle = Array.from({ length: end - start + 1 }, (_, index) => start + index);
  return [1, ...(start > 2 ? ['ellipsis-start' as const] : []), ...middle, ...(end < pageCount - 1 ? ['ellipsis-end' as const] : []), pageCount];
}

export interface PaginationProps {
  /** 1-based current page. */
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  /** Total items, shown as «1–10 de 42» when combined with `pageSize`. */
  totalItems?: number;
  pageSize?: number;
  className?: string;
}

const PAGE = cx(
  'flex h-9 min-w-9 cursor-pointer items-center justify-center rounded-full px-2 text-sm font-semibold tabular-nums outline-none',
  'text-text-primary transition-colors duration-(--duration-fast) data-hovered:bg-surface-hover data-focus-visible:focus-ring',
  'aria-[current=page]:bg-selection-fill aria-[current=page]:text-selection-mark',
);

/** Page navigation. Phones show «Página X de Y» with previous/next; wider screens add page numbers. */
export function Pagination({ page, pageCount, onPageChange, totalItems, pageSize, className }: PaginationProps) {
  const from = pageSize ? (page - 1) * pageSize + 1 : undefined;
  const to = pageSize && totalItems !== undefined ? Math.min(page * pageSize, totalItems) : undefined;
  return (
    <nav aria-label="Paginación" className={cx('flex flex-wrap items-center justify-between gap-3', className)}>
      <p className="text-sm text-text-secondary tabular-nums">
        {from !== undefined && to !== undefined && totalItems !== undefined
          ? <>Mostrando <strong className="text-text-primary">{from}–{to}</strong> de {totalItems}</>
          : <>Página {page} de {pageCount}</>}
      </p>
      <div className="flex items-center gap-1">
        <IconButton label="Página anterior" icon={<ChevronLeft />} size="sm" isDisabled={page <= 1} onPress={() => onPageChange(page - 1)} />
        <ul className="hidden items-center gap-1 sm:flex">
          {pageItems(page, pageCount).map((item) => (
            <li key={item}>
              {typeof item === 'number' ? (
                <AriaButton
                  className={PAGE}
                  aria-label={`Página ${item}`}
                  {...(item === page ? { 'aria-current': 'page' as const } : {})}
                  onPress={() => onPageChange(item)}
                >
                  {item}
                </AriaButton>
              ) : (
                <span aria-hidden="true" className="px-1 text-text-secondary">…</span>
              )}
            </li>
          ))}
        </ul>
        <span className="px-2 text-sm font-semibold tabular-nums sm:hidden">{page} / {pageCount}</span>
        <IconButton label="Página siguiente" icon={<ChevronRight />} size="sm" isDisabled={page >= pageCount} onPress={() => onPageChange(page + 1)} />
      </div>
    </nav>
  );
}
