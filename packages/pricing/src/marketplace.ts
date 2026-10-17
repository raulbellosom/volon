import { assertAmountMinor, money, type Money } from './money.ts';

export const MAX_MARKETPLACE_COMMISSION_BPS = 1_000;
export const BASIS_POINTS = 10_000;

export interface MarketplaceCommissionInput {
  readonly merchandiseSubtotalMinor: number;
  readonly commissionBps: number;
}

export interface MarketplaceCommissionResult {
  readonly merchandiseSubtotal: Money;
  readonly platformCommission: Money;
  readonly merchantAmountBeforeOtherAdjustments: Money;
  readonly commissionBps: number;
}

/** This commission excludes delivery, PSP fees, tax, tips and refunds. */
export function calculateMarketplaceCommission(
  input: MarketplaceCommissionInput,
): MarketplaceCommissionResult {
  assertAmountMinor(input.merchandiseSubtotalMinor, 'merchandiseSubtotalMinor');
  if (!Number.isSafeInteger(input.commissionBps)
      || input.commissionBps < 0
      || input.commissionBps > MAX_MARKETPLACE_COMMISSION_BPS) {
    throw new RangeError('commissionBps must be between 0 and 1000');
  }

  // Integer quotient + remainder avoids lossy multiplication of large values.
  const whole = Math.floor(input.merchandiseSubtotalMinor / BASIS_POINTS);
  const remainder = input.merchandiseSubtotalMinor % BASIS_POINTS;
  const commission = whole * input.commissionBps
    + Math.floor((remainder * input.commissionBps + BASIS_POINTS / 2) / BASIS_POINTS);
  assertAmountMinor(commission, 'platformCommissionMinor');
  const merchantAmount = input.merchandiseSubtotalMinor - commission;
  return {
    merchandiseSubtotal: money(input.merchandiseSubtotalMinor),
    platformCommission: money(commission),
    merchantAmountBeforeOtherAdjustments: money(merchantAmount),
    commissionBps: input.commissionBps,
  };
}
