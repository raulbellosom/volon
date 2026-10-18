import { CircleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { FieldError as AriaFieldError, Label, Text, type ValidationResult } from 'react-aria-components';
import { cx } from '../../utils/cx.ts';
import { fieldStyles } from './field-styles.ts';

export interface FieldLabelProps {
  children: ReactNode;
  isRequired?: boolean | undefined;
  className?: string | undefined;
}

/** Label with a visual required mark; React Aria exposes `aria-required` on the control itself. */
export function FieldLabel({ children, isRequired, className }: FieldLabelProps) {
  return (
    <Label className={cx(fieldStyles.label, className)}>
      {children}
      {isRequired && <span aria-hidden="true" className={fieldStyles.required}>*</span>}
    </Label>
  );
}

/** Help text linked to the control through `aria-describedby`. */
export function FieldDescription({ children }: { children: ReactNode }) {
  return <Text slot="description" className={fieldStyles.description}>{children}</Text>;
}

export type FieldErrorMessage = string | ((validation: ValidationResult) => string);

/** Validation message shown only when the field is invalid; announced with the control. */
export function FieldError({ children }: { children?: FieldErrorMessage | undefined }) {
  return (
    <AriaFieldError className={fieldStyles.error}>
      {(validation) => (
        <>
          <CircleAlert aria-hidden="true" />
          <span>{typeof children === 'function' ? children(validation) : (children ?? validation.validationErrors.join(' '))}</span>
        </>
      )}
    </AriaFieldError>
  );
}

export interface FieldChromeProps {
  label?: ReactNode;
  description?: ReactNode;
  errorMessage?: FieldErrorMessage | undefined;
  isRequired?: boolean | undefined;
  children: ReactNode;
}

/** Standard order: label, control, help text, error. Keeps every field identical. */
export function FieldChrome({ label, description, errorMessage, isRequired, children }: FieldChromeProps) {
  return (
    <>
      {label && <FieldLabel isRequired={isRequired}>{label}</FieldLabel>}
      {children}
      {description && <FieldDescription>{description}</FieldDescription>}
      <FieldError>{errorMessage}</FieldError>
    </>
  );
}
