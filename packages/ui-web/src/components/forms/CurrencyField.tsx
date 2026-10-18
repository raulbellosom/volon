import { Banknote } from 'lucide-react';
import type { ReactNode } from 'react';
import { I18nProvider } from 'react-aria-components';
import { defined } from '../../utils/defined.ts';
import { NumberField, type NumberFieldProps } from './NumberField.tsx';

const MXN = { style: 'currency', currency: 'MXN', currencyDisplay: 'narrowSymbol' } as const;

export interface CurrencyFieldProps
  extends Omit<NumberFieldProps, 'value' | 'defaultValue' | 'onChange' | 'minValue' | 'maxValue' | 'formatOptions' | 'icon' | 'step'> {
  /** Amount in centavos (integer), like every money value in the platform. `null` = empty. */
  valueMinor?: number | null;
  defaultValueMinor?: number;
  onChangeMinor?: (valueMinor: number | null) => void;
  /** Bounds in centavos. Defaults to a minimum of 0. */
  minValueMinor?: number;
  maxValueMinor?: number;
  /** Defaults to a banknote. */
  icon?: ReactNode;
}

const toMajor = (minor: number | null | undefined) => (minor === null || minor === undefined ? undefined : minor / 100);

/** Converts the parsed peso amount to integer centavos without floating-point drift. */
export function toMinorUnits(major: number): number | null {
  return Number.isFinite(major) ? Math.round(major * 100) : null;
}

/**
 * Peso (MXN) input formatted for es-MX whatever the app locale. Exposes integer centavos
 * so amounts never travel as floats; formatting and parsing stay in the field.
 */
export function CurrencyField({
  valueMinor,
  defaultValueMinor,
  onChangeMinor,
  minValueMinor = 0,
  maxValueMinor,
  icon = <Banknote />,
  hideStepper = true,
  ...props
}: CurrencyFieldProps) {
  const controlled = valueMinor !== undefined ? { value: valueMinor === null ? Number.NaN : valueMinor / 100 } : {};
  return (
    <I18nProvider locale="es-MX">
      <NumberField
        {...props}
        {...controlled}
        {...defined({ defaultValue: toMajor(defaultValueMinor), maxValue: toMajor(maxValueMinor) })}
        minValue={minValueMinor / 100}
        step={0.01}
        formatOptions={MXN}
        icon={icon}
        hideStepper={hideStepper}
        {...(onChangeMinor ? { onChange: (major: number) => onChangeMinor(toMinorUnits(major)) } : {})}
      />
    </I18nProvider>
  );
}
