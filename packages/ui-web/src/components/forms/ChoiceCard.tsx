import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  Checkbox as AriaCheckbox,
  Radio as AriaRadio,
  type CheckboxProps as AriaCheckboxProps,
  type RadioProps as AriaRadioProps,
} from 'react-aria-components';
import { cx, withStyles } from '../../utils/cx.ts';

const CARD = cx(
  'group relative flex min-h-16 cursor-pointer items-start gap-3 rounded-lg border-(length:--border-control) border-border-subtle',
  'bg-surface p-4 text-start text-text-primary outline-none',
  'transition-[border-color,background-color,box-shadow,transform] duration-(--duration-fast) ease-standard',
  'data-hovered:border-border data-hovered:shadow-1 data-pressed:scale-[0.99]',
  'data-selected:border-selection-fill data-selected:bg-surface-selected data-selected:shadow-[inset_0_0_0_1px_var(--color-selection-fill)]',
  'data-focus-visible:focus-ring data-invalid:border-feedback-danger-fg',
  'data-disabled:cursor-not-allowed data-disabled:border-border-subtle data-disabled:bg-surface-disabled data-disabled:text-text-disabled',
);

const ICON = cx(
  'flex size-10 shrink-0 items-center justify-center rounded-md bg-surface-selected text-text-on-secondary [&_svg]:size-5',
  'transition-colors duration-(--duration-fast) group-data-selected:bg-selection-fill group-data-selected:text-selection-mark',
  'group-data-disabled:bg-transparent group-data-disabled:text-text-disabled',
);

const MARK = cx(
  'absolute end-3 top-3 flex size-5 items-center justify-center rounded-full border-(length:--border-control) border-border',
  'text-selection-mark transition-[transform,background-color] duration-(--duration-fast) ease-spring',
  'group-data-selected:border-selection-fill group-data-selected:bg-selection-fill group-data-disabled:opacity-50',
);

interface ChoiceContentProps {
  icon: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Extra info aligned to the end of the title (e.g. a price or a Badge). */
  meta?: ReactNode;
}

function ChoiceContent({ icon, title, description, meta }: ChoiceContentProps) {
  return (
    <>
      <span aria-hidden="true" className={ICON}>{icon}</span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 pe-7">
        <span className="flex flex-wrap items-center gap-x-2 text-md font-semibold">{title}{meta}</span>
        {description && <span className="text-sm text-text-secondary group-data-disabled:text-text-disabled">{description}</span>}
      </span>
      <span aria-hidden="true" className={MARK}>
        <Check className="size-3 scale-0 transition-transform group-data-selected:scale-100" strokeWidth={3.5} />
      </span>
    </>
  );
}

export type RadioCardProps = Omit<AriaRadioProps, 'children' | 'className'> & ChoiceContentProps & { className?: string };

/** Large, touch-friendly radio option. Place several inside a `RadioGroup`. */
export function RadioCard({ icon, title, description, meta, className, ...props }: RadioCardProps) {
  return (
    <AriaRadio {...props} className={withStyles(className, () => CARD)}>
      <ChoiceContent icon={icon} title={title} description={description} meta={meta} />
    </AriaRadio>
  );
}

export type CheckboxCardProps = Omit<AriaCheckboxProps, 'children' | 'className'> & ChoiceContentProps & { className?: string };

/** Large, touch-friendly checkbox option. Place several inside a `CheckboxGroup`. */
export function CheckboxCard({ icon, title, description, meta, className, ...props }: CheckboxCardProps) {
  return (
    <AriaCheckbox {...props} className={withStyles(className, () => CARD)}>
      <ChoiceContent icon={icon} title={title} description={description} meta={meta} />
    </AriaCheckbox>
  );
}
