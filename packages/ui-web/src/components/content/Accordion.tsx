import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  Button as AriaButton,
  Disclosure,
  DisclosureGroup,
  DisclosurePanel,
  Heading,
  type DisclosureGroupProps,
} from 'react-aria-components';
import { cx } from '../../utils/cx.ts';

export interface AccordionProps extends Omit<DisclosureGroupProps, 'children' | 'className'> {
  children: ReactNode;
  className?: string;
}

/** Stack of collapsible sections (FAQs, long forms). Use `allowsMultipleExpanded` to keep several open. */
export function Accordion({ children, className, ...props }: AccordionProps) {
  return (
    <DisclosureGroup {...props} className={cx('flex flex-col divide-y divide-border-subtle overflow-hidden rounded-xl border border-border-subtle bg-surface', className)}>
      {children}
    </DisclosureGroup>
  );
}

export interface AccordionItemProps {
  id: string;
  title: ReactNode;
  /** Short secondary line under the title. */
  subtitle?: ReactNode;
  icon?: ReactNode;
  /** Heading level of the trigger in the page outline. */
  level?: 2 | 3 | 4;
  isDisabled?: boolean;
  children: ReactNode;
}

/** One section: the trigger is a real button inside a heading, the panel is labelled by it. */
export function AccordionItem({ id, title, subtitle, icon, level = 3, isDisabled, children }: AccordionItemProps) {
  return (
    <Disclosure id={id} {...(isDisabled ? { isDisabled } : {})} className="group">
      <Heading level={level}>
        <AriaButton
          slot="trigger"
          className={cx(
            'flex min-h-14 w-full cursor-pointer items-center gap-3 px-5 py-3 text-start outline-none',
            'transition-colors data-hovered:bg-surface-hover data-focus-visible:focus-ring data-focus-visible:-outline-offset-2',
            'data-disabled:cursor-not-allowed data-disabled:opacity-45 data-disabled:data-hovered:bg-transparent',
          )}
        >
          {icon && <span aria-hidden="true" className="flex text-text-secondary [&_svg]:size-5">{icon}</span>}
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-md font-semibold text-text-primary">{title}</span>
            {subtitle && <span className="text-sm font-normal text-text-secondary">{subtitle}</span>}
          </span>
          <ChevronDown
            aria-hidden="true"
            className="size-5 shrink-0 text-text-secondary transition-transform duration-(--duration-base) ease-standard group-data-expanded:rotate-180"
          />
        </AriaButton>
      </Heading>
      <DisclosurePanel className="px-5 pb-5 text-md text-text-secondary">{children}</DisclosurePanel>
    </Disclosure>
  );
}
