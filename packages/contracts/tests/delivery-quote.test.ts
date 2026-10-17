import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { InvalidQuoteRequest, parseDeliveryQuoteRequest } from '../src/index.ts';

const valid = { branchId: 'br_synthetic', pickup: { lat: 0, lng: 0 },
  dropoff: { lat: 1, lng: 1 }, serviceType: 'local_delivery' };

test('quote contract: accepts boundary coordinates and makes an independent immutable DTO', () => {
  const input = { ...valid, pickup: { lat: -90, lng: 180 }, dropoff: { lat: 90, lng: -180 } };
  const parsed = parseDeliveryQuoteRequest(input);
  input.pickup.lat = 5;
  assert.equal(parsed.pickup.lat, -90);
  assert.ok(Object.isFrozen(parsed));
  assert.ok(Object.isFrozen(parsed.pickup));
});

test('quote contract: rejects malformed values and client price/identity injection', () => {
  for (const input of [null, [], {}, { ...valid, branchId: '' }, { ...valid, branchId: 'a'.repeat(129) },
    { ...valid, branchId: ' br' }, { ...valid, serviceType: 'express' },
    { ...valid, routeDistanceMeters: 5 }, { ...valid, baseFeeMinor: 0 },
    { ...valid, subjectId: 'other' }, { ...valid, pickup: { lat: '0', lng: 0 } },
    { ...valid, pickup: { lat: NaN, lng: 0 } }, { ...valid, pickup: { lat: Infinity, lng: 0 } },
    { ...valid, pickup: { lat: 90.001, lng: 0 } }, { ...valid, dropoff: { lat: 0, lng: -180.001 } },
    { ...valid, dropoff: { lat: 0 } }, { ...valid, pickup: { lat: 0, lng: 0, label: 'extra' } }]) {
    assert.throws(() => parseDeliveryQuoteRequest(input), InvalidQuoteRequest);
  }
});

test('formal schema: declares the same closed v1 request fields and response', async () => {
  const schema = JSON.parse(await readFile(new URL('../delivery-quote.schema.json', import.meta.url), 'utf8'));
  assert.deepEqual(Object.keys(parseDeliveryQuoteRequest(valid)).sort(), [...schema.required].sort());
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.$defs.point.additionalProperties, false);
  assert.equal(schema.properties.serviceType.const, valid.serviceType);
  assert.equal(schema.$defs.response.properties.currency.const, 'MXN');
});
