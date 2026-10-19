import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizePublicReference, PUBLIC_REFERENCE_PATTERN, PUBLIC_REFERENCE_ALPHABET, parseDeliveryResponse } from '@delivery/contracts';
import { generatePublicReference, allocatePublicReference } from '../src/modules/deliveries/public-reference.ts';
import { readConfig } from '../src/config.ts';

test('public references: CSPRNG format and complete normalization, without ambiguous symbols or partial matches', () => {
  assert.equal(PUBLIC_REFERENCE_ALPHABET.length, 30);
  const rows = Array.from({ length: 1000 }, () => generatePublicReference(new Date('2026-10-19T00:00:00Z')));
  for (const row of rows) assert.match(row, /^VL-26-[23456789ABCDEFGHJKMNPQRSTVWXYZ]{6}$/);
  for (const input of ['VL-26-7K9M2Q', 'vl267k9m2q', ' VL 26 7k9m2q ']) assert.equal(normalizePublicReference(input), 'VL-26-7K9M2Q');
  for (const input of ['', 'VL-26-7K9M2', 'VL-26-7K9M2O', 'VL-26-7K9M2I', 'VL-26-7K9M2L', 'VL-26-7K9M2U',
    'VL-26-7K9M21', 'VL-26-7K9M20', 'VL--26-7K9M2Q', 'x'.repeat(33), '../VL267K9M2Q', 'ß-26-7K9M2Q', null])
    assert.throws(() => normalizePublicReference(input));
  assert.match(normalizePublicReference('ABCD-27-23456789AB'), PUBLIC_REFERENCE_PATTERN);
});

test('public references: UTC year rollover and configurable prefix affect future issuance only', () => {
  const sample = () => 0;
  const historical = generatePublicReference(new Date('2026-12-31T23:59:59.999Z'), 'VL', sample);
  assert.equal(historical, 'VL-26-222222');
  assert.equal(generatePublicReference(new Date('2027-01-01T00:00:00Z'), 'AB', sample), 'AB-27-222222');
  assert.equal(historical, 'VL-26-222222');
  for (const prefix of ['', 'vL', 'A', 'ABCDE', 'V1']) assert.throws(() => generatePublicReference(new Date(), prefix));
  const env = { DATABASE_URL: 'postgresql://localhost/postgres', SUPABASE_URL: 'http://localhost',
    SUPABASE_PUBLISHABLE_KEY: 'synthetic', LOCAL_SYNTHETIC_MODE: 'true', DELIVERY_REFERENCE_PREFIX: 'AB' };
  assert.equal(readConfig(env).referencePrefix, 'AB');
  assert.throws(() => readConfig({ ...env, DELIVERY_REFERENCE_PREFIX: 'invalid' }));
});

test('public references: collisions retry eight times at most; exhaustion and infrastructure failures fail closed', async () => {
  let attempts = 0;
  const time = new Date();
  assert.equal(await allocatePublicReference(time, async () => ++attempts === 3, () => 'VL-26-7K9M2Q'), 'VL-26-7K9M2Q');
  assert.equal(attempts, 3);
  attempts = 0;
  await assert.rejects(allocatePublicReference(time, async () => { attempts++; return false; }), /exhausted/);
  assert.equal(attempts, 8);
  await assert.rejects(allocatePublicReference(time, async () => { throw new Error('synthetic unavailable'); }), /unavailable/);
});

test('public references: closed Delivery response requires canonical publicReference', () => {
  for (const publicReference of [undefined, 'vl267k9m2q', 'VL-26-123456']) assert.throws(() => parseDeliveryResponse({
    deliveryId: 'synthetic', publicReference, branchId: 'b', quoteId: 'q', status: 'requested', version: 1,
    createdAt: '2026-10-19T00:00:00.000Z', pricing: { amountMinor: 0, currency: 'MXN', rateVersion: 'test',
      lines: [{ code: 'base_delivery', amountMinor: 0 }, { code: 'distance_delivery', amountMinor: 0 }] },
  }));
});
