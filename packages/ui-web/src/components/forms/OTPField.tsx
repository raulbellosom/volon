import { useState, type ReactNode } from 'react';
import { Input, TextField as AriaTextField } from 'react-aria-components';
import { cx } from '../../utils/cx.ts';
import { defined } from '../../utils/defined.ts';
import { FieldChrome, type FieldErrorMessage } from './FieldParts.tsx';
import { fieldStyles } from './field-styles.ts';

export interface OTPFieldProps {
  label: ReactNode;
  description?: ReactNode;
  errorMessage?: FieldErrorMessage;
  /** Number of digits. */
  length?: number;
  value?: string;
  defaultValue?: string;
  onChange?: (code: string) => void;
  /** Called once every digit is filled, e.g. to submit automatically. */
  onComplete?: (code: string) => void;
  isInvalid?: boolean;
  isDisabled?: boolean;
  autoFocus?: boolean;
  className?: string;
}

const BOX = cx(
  'flex size-12 items-center justify-center rounded-md border-(length:--border-control) border-border bg-surface',
  'text-xl font-bold tabular-nums text-text-primary transition-[border-color,box-shadow] duration-(--duration-fast)',
  'group-data-invalid:border-feedback-danger-fg group-data-disabled:bg-surface-disabled group-data-disabled:text-text-disabled',
);

const ACTIVE_BOX = 'group-focus-within/otp:border-focus-ring group-focus-within/otp:field-halo';

/**
 * One-time code entry drawn as boxes over a single real input, so paste, SMS autofill
 * (`autocomplete="one-time-code"`) and screen readers all work. Only digits are kept.
 */
export function OTPField({
  label,
  description,
  errorMessage,
  length = 6,
  value,
  defaultValue = '',
  onChange,
  onComplete,
  className,
  ...props
}: OTPFieldProps) {
  const [internal, setInternal] = useState(defaultValue);
  const code = value ?? internal;
  const active = Math.min(code.length, length - 1);

  function handleChange(raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, length);
    if (value === undefined) setInternal(digits);
    onChange?.(digits);
    if (digits.length === length && digits !== code) onComplete?.(digits);
  }

  return (
    <AriaTextField
      value={code}
      onChange={handleChange}
      {...defined({ isInvalid: props.isInvalid, isDisabled: props.isDisabled, autoFocus: props.autoFocus })}
      className={cx(fieldStyles.root, className)}
    >
      <FieldChrome label={label} description={description} errorMessage={errorMessage}>
        <div className="group/otp relative w-fit">
          <div aria-hidden="true" className="flex gap-2">
            {Array.from({ length }, (_, index) => (
              <span key={index} className={cx(BOX, index === active && ACTIVE_BOX)}>{code[index] ?? ''}</span>
            ))}
          </div>
          <Input
            inputMode="numeric"
            autoComplete="one-time-code"
            // No maxLength: it would truncate pasted codes with spaces before digits are extracted.
            pattern={`\\d{${length}}`}
            className="absolute inset-0 size-full cursor-text bg-transparent text-md text-transparent caret-transparent outline-none selection:bg-transparent disabled:cursor-not-allowed"
          />
        </div>
      </FieldChrome>
    </AriaTextField>
  );
}
