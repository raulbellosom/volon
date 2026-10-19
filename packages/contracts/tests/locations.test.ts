import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { parseDeliveryQuoteRequest, InvalidQuoteRequest, parseDeliveryLocationsResponse,
  parsePickupLocationResponse } from '../src/index.ts';

const request = { branchId: 'branch_synthetic_a', pickup: { lat: 0, lng: 0 },
  dropoff: { lat: 0.02, lng: 0.02 }, serviceType: 'local_delivery' };
const destination = { addressLine: 'Calle Sintética 123, Colonia Prueba', instructions: 'Entrada de prueba',
  source: 'synthetic', verification: 'unverified' };

test('destination: optional legacy input; independent immutable enriched DTO', () => {
  assert.equal(parseDeliveryQuoteRequest(request).destination, undefined);
  const input = { ...request, destination: { ...destination } };
  const parsed = parseDeliveryQuoteRequest(input);
  input.destination.addressLine = 'Changed';
  assert.equal(parsed.destination?.addressLine, destination.addressLine);
  assert.ok(Object.isFrozen(parsed.destination));
  assert.doesNotThrow(() => parseDeliveryQuoteRequest({ ...request, destination: {
    ...destination, addressLine: '🧪'.repeat(240), instructions: 'a'.repeat(500) } }));
});

test('destination: closed, bounded, single-line, synthetic and never client-verified', () => {
  for (const invalid of [null, undefined, [], {}, { ...destination, addressLine: '' },
    { ...destination, addressLine: ' a' }, { ...destination, addressLine: 'a ' },
    { ...destination, addressLine: 'a\nb' }, { ...destination, addressLine: 'a\u2028b' },
    { ...destination, addressLine: '\ud800' }, { ...destination, addressLine: '🧪'.repeat(241) },
    { ...destination, instructions: 'a'.repeat(501) }, { ...destination, instructions: '' },
    { ...destination, instructions: null }, { ...destination, phone: '555' },
    { ...destination, source: 'geocoded' }, { ...destination, source: 'user_selected' },
    { ...destination, verification: 'verified' }]) {
    assert.throws(() => parseDeliveryQuoteRequest({ ...request, destination: invalid }), InvalidQuoteRequest);
  }
  assert.throws(() => parseDeliveryQuoteRequest({ ...request, pickupOrigin: 'branch_record' }), InvalidQuoteRequest);
});

test('location response validators: strict projection, provenance and legacy nullability', () => {
  const pickup = { coordinates: request.pickup, source: 'branch_record', verification: 'unverified' };
  assert.doesNotThrow(() => parsePickupLocationResponse({ branchId: request.branchId, ...pickup }));
  const response = { branchId: request.branchId, pickup,
    dropoff: { coordinates: request.dropoff, ...destination } };
  assert.deepEqual(parseDeliveryLocationsResponse(response), response);
  const legacy = { ...response, pickup: { ...pickup, source: 'legacy_input' },
    dropoff: { coordinates: request.dropoff, addressLine: null, instructions: null,
      source: 'legacy_input', verification: 'unverified' } };
  assert.deepEqual(parseDeliveryLocationsResponse(legacy), legacy);
  for (const invalid of [{ ...response, subjectId: 'secret' },
    { ...response, pickup: { ...pickup, verification: 'verified' } },
    { ...legacy, dropoff: { ...legacy.dropoff, addressLine: 'untrusted' } }]) {
    assert.throws(() => parseDeliveryLocationsResponse(invalid));
  }
});

test('location formal schemas keep destination optional, closed and constrained', async () => {
  const quote = JSON.parse(await readFile(new URL('../delivery-quote.schema.json', import.meta.url), 'utf8'));
  const locations = JSON.parse(await readFile(new URL('../locations.schema.json', import.meta.url), 'utf8'));
  assert.equal(quote.required.includes('destination'), false);
  assert.equal(quote.$defs.destination.additionalProperties, false);
  assert.equal(quote.$defs.destination.properties.addressLine.maxLength, 240);
  assert.equal(quote.$defs.destination.properties.instructions.maxLength, 500);
  assert.equal(locations.$defs.snapshot.additionalProperties, false);
  assert.equal(locations.$defs.pickup.properties.source.const, 'branch_record');
});
