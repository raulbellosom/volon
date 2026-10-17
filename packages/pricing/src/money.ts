export type Currency = 'MXN';

export interface Money {
  readonly amountMinor: number;
  readonly currency: Currency;
}

export function assertAmountMinor(value: number, field = 'amountMinor'): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${field} must be a non-negative safe integer`);
  }
}

export function money(amountMinor: number, currency: Currency = 'MXN'): Money {
  assertAmountMinor(amountMinor);
  if (currency !== 'MXN') throw new RangeError('Unsupported currency');
  return Object.freeze({ amountMinor, currency });
}
