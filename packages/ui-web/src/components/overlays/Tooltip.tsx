import type { ReactElement, ReactNode } from 'react';
import {
  OverlayArrow,
  Tooltip as AriaTooltip,
  TooltipTrigger,
  type TooltipProps as AriaTooltipProps,
} from 'react-aria-components';
import { cx } from '../../utils/cx.ts';

export interface TooltipProps {
  /** Short supplementary text. Never put essential information or actions here. */
  content: ReactNode;
  /** A single focusable React Aria element (Button, IconButton, Link). */
  children: ReactElement;
  placement?: AriaTooltipProps['placement'];
  /** Milliseconds before showing on hover; focus shows it immediately. */
  delay?: number;
  isDisabled?: boolean;
}

/**
 * Inverted bubble (deep blue on light, white on dark) that labels or explains a control on
 * hover and keyboard focus; Escape closes it. On touch it is not shown, so the control must
 * still have its own accessible name.
 */
export function Tooltip({ content, children, placement = 'top', delay = 500, isDisabled }: TooltipProps) {
  return (
    <TooltipTrigger delay={delay} closeDelay={100} {...(isDisabled ? { isDisabled } : {})}>
      {children}
      <AriaTooltip
        placement={placement}
        offset={8}
        className={cx(
          'z-(--z-tooltip) max-w-64 rounded-sm bg-text-primary px-2.5 py-1.5 text-sm font-semibold text-surface shadow-2',
          'data-entering:animate-popover-in data-exiting:animate-popover-out',
        )}
      >
        <OverlayArrow>
          <svg width={10} height={6} viewBox="0 0 10 6" className="fill-text-primary group-data-[placement=bottom]:rotate-180">
            <path d="M0 0 L5 6 L10 0" />
          </svg>
        </OverlayArrow>
        {content}
      </AriaTooltip>
    </TooltipTrigger>
  );
}
