import { assertAmountMinor, money, type Money } from './money.ts';

export interface DeliveryRatePolicy {
  readonly baseFeeMinor: number;
  readonly includedDistanceMeters: number;
  readonly additionalFeePerStartedKmMinor: number;
  readonly maximumRouteMeters: number;
}

export interface DeliveryQuoteInput {
  /** Distance provided by a trusted routing adapter, not an arbitrary client value. */
  readonly routeDistanceMeters: number;
  readonly policy: DeliveryRatePolicy;
}

export interface DeliveryQuoteResult {
  readonly logisticsFee: Money;
  readonly routeDistanceMeters: number;
  readonly billedExtraKilometers: number;
}

export function calculateDeliveryQuote(input: DeliveryQuoteInput): DeliveryQuoteResult {
  const { policy, routeDistanceMeters } = input;
  for (const [key, value] of Object.entries({
    baseFeeMinor: policy.baseFeeMinor,
    includedDistanceMeters: policy.includedDistanceMeters,
    additionalFeePerStartedKmMinor: policy.additionalFeePerStartedKmMinor,
    maximumRouteMeters: policy.maximumRouteMeters,
    routeDistanceMeters,
  })) assertAmountMinor(value, key);

  if (policy.includedDistanceMeters > policy.maximumRouteMeters) {
    throw new RangeError('includedDistanceMeters exceeds maximumRouteMeters');
  }
  if (routeDistanceMeters > policy.maximumRouteMeters) {
    throw new RangeError('Route outside the rate policy');
  }
  const extraMeters = Math.max(0, routeDistanceMeters - policy.includedDistanceMeters);
  const extraKm = Math.ceil(extraMeters / 1_000);
  const total = policy.baseFeeMinor + extraKm * policy.additionalFeePerStartedKmMinor;
  assertAmountMinor(total, 'logisticsFeeMinor');
  return { logisticsFee: money(total), routeDistanceMeters, billedExtraKilometers: extraKm };
}
