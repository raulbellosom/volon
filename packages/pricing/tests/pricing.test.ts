import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateMarketplaceCommission, MAX_MARKETPLACE_COMMISSION_BPS } from '../src/marketplace.ts';
import { calculateDeliveryQuote, type DeliveryRatePolicy } from '../src/delivery.ts';

const SAMPLE_RATE: DeliveryRatePolicy = {
  baseFeeMinor: 3_000,
  includedDistanceMeters: 2_000,
  additionalFeePerStartedKmMinor: 700,
  maximumRouteMeters: 8_000,
};

test('marketplace: 10% of MXN 300, excluding delivery', () => {
  const result = calculateMarketplaceCommission({ merchandiseSubtotalMinor: 30_000, commissionBps: 1_000 });
  assert.equal(result.platformCommission.amountMinor, 3_000);
  assert.equal(result.merchantAmountBeforeOtherAdjustments.amountMinor, 27_000);
  assert.equal(result.platformCommission.currency, 'MXN');
});

test('marketplace: configurable lower commission and cent rounding', () => {
  assert.equal(calculateMarketplaceCommission({ merchandiseSubtotalMinor: 1_005, commissionBps: 750 })
    .platformCommission.amountMinor, 75);
  assert.equal(calculateMarketplaceCommission({ merchandiseSubtotalMinor: 5, commissionBps: 1_000 })
    .platformCommission.amountMinor, 1);
});

test('marketplace: zero subtotal and large safe integers', () => {
  assert.equal(calculateMarketplaceCommission({ merchandiseSubtotalMinor: 0, commissionBps: 1_000 })
    .platformCommission.amountMinor, 0);
  const result = calculateMarketplaceCommission({ merchandiseSubtotalMinor: Number.MAX_SAFE_INTEGER, commissionBps: 1_000 });
  assert.equal(result.platformCommission.amountMinor, 900_719_925_474_099);
});

test('marketplace: rejects commission greater than 10%, fractions and negative amounts', () => {
  assert.equal(MAX_MARKETPLACE_COMMISSION_BPS, 1_000);
  for (const bps of [-1, 1_001, 12.5, Number.NaN]) {
    assert.throws(() => calculateMarketplaceCommission({ merchandiseSubtotalMinor: 10_000, commissionBps: bps }), RangeError);
  }
  assert.throws(() => calculateMarketplaceCommission({ merchandiseSubtotalMinor: -1, commissionBps: 1_000 }), RangeError);
});

test('delivery: separate flat base inside included distance', () => {
  const result = calculateDeliveryQuote({ policy: SAMPLE_RATE, routeDistanceMeters: 1_999 });
  assert.equal(result.logisticsFee.amountMinor, 3_000);
  assert.equal(result.billedExtraKilometers, 0);
});

test('delivery: increments by started kilometer after included distance', () => {
  assert.equal(calculateDeliveryQuote({ policy: SAMPLE_RATE, routeDistanceMeters: 2_001 })
    .logisticsFee.amountMinor, 3_700);
  assert.equal(calculateDeliveryQuote({ policy: SAMPLE_RATE, routeDistanceMeters: 4_000 })
    .logisticsFee.amountMinor, 4_400);
});

test('delivery: distance outside policy is rejected', () => {
  assert.throws(() => calculateDeliveryQuote({ policy: SAMPLE_RATE, routeDistanceMeters: 8_001 }), RangeError);
  assert.throws(() => calculateDeliveryQuote({ policy: SAMPLE_RATE, routeDistanceMeters: -1 }), RangeError);
});

test('delivery: rejects missing or inconsistent commercial configuration', () => {
  assert.throws(() => calculateDeliveryQuote({ policy: { ...SAMPLE_RATE, baseFeeMinor: -1 }, routeDistanceMeters: 500 }), RangeError);
  assert.throws(() => calculateDeliveryQuote({ policy: { ...SAMPLE_RATE, includedDistanceMeters: 9_000 }, routeDistanceMeters: 500 }), RangeError);
  assert.throws(() => calculateDeliveryQuote({ policy: { ...SAMPLE_RATE, additionalFeePerStartedKmMinor: Number.NaN }, routeDistanceMeters: 500 }), RangeError);
});
