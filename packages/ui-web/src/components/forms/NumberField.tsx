import { Minus, Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  Button as AriaButton,
  Group,
  Input,
  NumberField as AriaNumberField,
  type NumberFieldProps as AriaNumberFieldProps,
} from 'react-aria-components';
import { cx, withStyles } from '../../utils/cx.ts';
import { defined } from '../../utils/defined.ts';
import { FieldChrome, type FieldErrorMessage } from './FieldParts.tsx';
import { bareInputStyles, controlBoxStyles, fieldIconStyles, fieldStyles, type ControlSize } from './field-styles.ts';

export interface NumberFieldProps extends Omit<AriaNumberFieldProps, 'children' | 'className'> {
  label?: ReactNode;
  description?: ReactNode;
  errorMessage?: FieldErrorMessage;
  placeholder?: string;
  size?: ControlSize;
  /** Required by design (see TextField). */
  icon: ReactNode;
  /** Unit shown after the value, e.g. «kg» or «km». */
  unit?: string;
  /** Hide −/+ buttons when stepping makes no sense (amounts typed exactly). */
  hideStepper?: boolean;
  className?: string;
}

const STEP = cx(
  'flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-sm text-text-secondary outline-none',
  'transition-colors data-hovered:bg-surface-hover data-hovered:text-text-primary data-pressed:bg-surface-selected',
  'data-focus-visible:focus-ring data-disabled:cursor-not-allowed data-disabled:opacity-40 [&_svg]:size-4',
);

/**
 * Numeric input with locale-aware formatting and parsing, min/max/step validation and
 * keyboard support (↑/↓ step, PageUp/PageDown, Home/End when bounded).
 */
export function NumberField({
  label,
  description,
  errorMessage,
  placeholder,
  size = 'md',
  icon,
  unit,
  hideStepper,
  className,
  ...props
}: NumberFieldProps) {
  return (
    <AriaNumberField {...props} className={withStyles(className, () => fieldStyles.root)}>
      <FieldChrome label={label} description={description} errorMessage={errorMessage} isRequired={props.isRequired}>
        <Group className={controlBoxStyles({ size })}>
          <span aria-hidden="true" className={fieldIconStyles(size)}>{icon}</span>
          <Input {...defined({ placeholder })} className={cx(bareInputStyles, 'tabular-nums')} />
          {unit && <span aria-hidden="true" className="shrink-0 text-sm font-semibold text-text-secondary">{unit}</span>}
          {!hideStepper && (
            <span className="-me-1 flex shrink-0 items-center gap-0.5">
              <AriaButton slot="decrement" className={STEP}><Minus aria-hidden="true" /></AriaButton>
              <AriaButton slot="increment" className={STEP}><Plus aria-hidden="true" /></AriaButton>
            </span>
          )}
        </Group>
      </FieldChrome>
    </AriaNumberField>
  );
}
