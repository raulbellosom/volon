import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { parseCreateDeliveryRequest, parseIdempotencyKey, InvalidDeliveryRequest, InvalidIdempotencyKey } from '../src/index.ts';

test('Delivery contract: closes input to quote and branch identifiers, refusing identity/state/payment/price injection', () => {
  const valid = { branchId: 'branch_synthetic_a', quoteId: 'quote_synthetic' };
  assert.deepEqual(parseCreateDeliveryRequest(valid), valid);
  assert.ok(Object.isFrozen(parseCreateDeliveryRequest(valid)));
  for (const input of [null, [], {}, { ...valid, quoteId: '' }, { ...valid, branchId: 1 },
    { ...valid, quoteId: 'x'.repeat(129) }, { ...valid, quoteId: '../quote' },
    ...['subjectId', 'merchantId', 'status', 'paid', 'amountMinor', 'recipient'].map((key) => ({ ...valid, [key]: true }))]) {
    assert.throws(() => parseCreateDeliveryRequest(input), InvalidDeliveryRequest);
  }
});

test('Delivery contract: requires one bounded opaque Idempotency-Key', () => {
  assert.equal(parseIdempotencyKey('key_123-ABC'), 'key_123-ABC');
  assert.equal(parseIdempotencyKey('k'.repeat(128)).length, 128);
  for (const key of [null, '', ' key', 'a,b', 'a b', 'x'.repeat(129), 'á']) {
    assert.throws(() => parseIdempotencyKey(key), InvalidIdempotencyKey);
  }
});

test('Delivery formal schema: matches the closed DTO fields and initial state', async () => {
  const schema = JSON.parse(await readFile(new URL('../delivery.schema.json', import.meta.url), 'utf8'));
  assert.equal(schema.additionalProperties, false);
  assert.deepEqual([...schema.required].sort(), Object.keys(parseCreateDeliveryRequest({ branchId: 'a', quoteId: 'b' })).sort());
  assert.equal(schema.$defs.response.properties.status.const, 'requested');
  assert.equal(schema.$defs.response.properties.version.const, 1);
});
