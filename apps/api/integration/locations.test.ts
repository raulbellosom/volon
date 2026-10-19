import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { parseDeliveryLocationsResponse, parsePickupLocationResponse } from '@delivery/contracts';
import { admin, db, login, newQuote, createDelivery, readDelivery, base, required } from './delivery-fixtures.ts';
import { withSubject, createDatabase } from '../src/infrastructure/database.ts';
import { createLocationRepository } from '../src/infrastructure/location.repository.ts';
import { createLocationHandler } from '../src/modules/locations/location.handler.ts';
import { createSupabaseAuthenticator } from '../src/infrastructure/supabase-auth.adapter.ts';

const branchId = 'branch_synthetic_a';
const destination = { addressLine: 'Calle Sintética 123, Colonia Prueba', instructions: 'Puerta de prueba',
  source: 'synthetic', verification: 'unverified' };
const input = { branchId, pickup: { lat: 0.000001, lng: 0 }, dropoff: { lat: 0.02, lng: 0.02 },
  serviceType: 'local_delivery', destination };
const get = (token: string, path: string) => fetch(`${base}${path}`, { headers: { authorization: `Bearer ${token}` } });
const quote = (token: string, body: unknown = input) => fetch(`${base}/v1/delivery-quotes`, {
  method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

test('locations: authoritative pickup, frozen destination, immutable Delivery and idempotent replay', async () => {
  const a = await login();
  const current = await get(a.token, `/v1/branches/${branchId}/pickup-location`);
  assert.equal(current.status, 200);
  assert.deepEqual(parsePickupLocationResponse(await current.json()), { branchId, coordinates: { lat: 0, lng: 0 },
    source: 'branch_record', verification: 'unverified' });
  const client = { ...input, destination: { ...destination } };
  const quoted = await quote(a.token, client);
  assert.equal(quoted.status, 201);
  const { quoteId } = await quoted.json();
  client.destination.addressLine = 'Changed client address';
  const expected = { branchId,
    pickup: { coordinates: { lat: 0, lng: 0 }, source: 'branch_record', verification: 'unverified' },
    dropoff: { coordinates: input.dropoff, ...destination } };
  const quoteRead = await get(a.token, `/v1/delivery-quotes/${quoteId}/locations`);
  assert.equal(quoteRead.status, 200);
  assert.equal(quoteRead.headers.get('cache-control'), 'no-store');
  assert.deepEqual(parseDeliveryLocationsResponse(await quoteRead.json()), expected);
  const key = randomUUID();
  let deliveryId: string;
  // Moving the live branch after quoting must not move the accepted snapshot.
  await admin.branch.update({ where: { id: branchId }, data: { latitude: 0.001 } });
  try {
    const created = await createDelivery(a.token, quoteId, key);
    assert.equal(created.status, 201);
    const delivery = await created.json();
    deliveryId = delivery.deliveryId;
    const saved = await admin.delivery.findUniqueOrThrow({ where: { id: deliveryId } });
    const quotedRow = await admin.pricingQuote.findUniqueOrThrow({ where: { id: quoteId } });
    assert.deepEqual(saved.routeSnapshot, quotedRow.request);
    await admin.pricingQuote.update({ where: { id: quoteId }, data: { request: {
      ...input, pickup: { lat: 0, lng: 0 }, pickupOrigin: 'branch_record',
      destination: { ...destination, addressLine: 'Changed administrative quote' },
    } } });
    const replay = await createDelivery(a.token, quoteId, key);
    assert.equal(replay.status, 201);
    assert.deepEqual(await replay.json(), delivery);
    const snapshot = await get(a.token, `/v1/deliveries/${deliveryId}/locations`);
    assert.equal(snapshot.status, 200);
    assert.deepEqual(parseDeliveryLocationsResponse(await snapshot.json()), expected);
    await assert.rejects(admin.delivery.update({ where: { id: deliveryId }, data: { routeSnapshot: {} } }));
    await assert.rejects(withSubject(db, a, (tx) => tx.pricingQuote.update({ where: { id: quoteId }, data: { request: {} } })));
    const summary = await (await readDelivery(a.token, deliveryId)).json();
    for (const field of ['routeSnapshot', 'destination', 'pickup', 'dropoff', 'subjectId', 'requestHash', 'idempotencyKeyHash']) {
      assert.equal(field in summary, false);
    }
  } finally { await admin.branch.update({ where: { id: branchId }, data: { latitude: 0 } }); }
  const second = await quote(a.token);
  assert.equal(second.status, 201);
  assert.equal((await createDelivery(a.token, (await second.json()).quoteId, key)).status, 409);
  const injection = await fetch(`${base}/v1/deliveries`, { method: 'POST',
    headers: { authorization: `Bearer ${a.token}`, 'content-type': 'application/json', 'idempotency-key': key },
    body: JSON.stringify({ branchId, quoteId, destination: { ...destination, addressLine: 'Replacement' } }),
  });
  assert.equal(injection.status, 422);
});

test('locations: rejects spoofed pickup, foreign branch, malformed coordinates, address and verification', async () => {
  const a = await login();
  for (const [body, status] of [
    [{ ...input, pickup: { lat: 0.02, lng: 0.02 } }, 422],
    [{ ...input, branchId: 'branch_synthetic_b' }, 403],
    [{ ...input, pickupOrigin: 'branch_record' }, 422],
    [{ ...input, dropoff: { lat: 91, lng: 0 } }, 422],
    [{ ...input, destination: {} }, 422],
    [{ ...input, destination: { ...destination, addressLine: '' } }, 422],
    [{ ...input, destination: { ...destination, instructions: 'x'.repeat(501) } }, 422],
    [{ ...input, destination: { ...destination, source: 'geocoded', verification: 'verified' } }, 422],
  ] as const) assert.equal((await quote(a.token, body)).status, status);
});

test('locations: RLS isolates tenants and revocation/disabled merchant or branch hides every read', async () => {
  const a = await login();
  const b = await login('b');
  const quoted = await quote(a.token);
  assert.equal(quoted.status, 201);
  const { quoteId } = await quoted.json();
  const created = await createDelivery(a.token, quoteId);
  assert.equal(created.status, 201);
  const { deliveryId } = await created.json();
  const paths = [`/v1/branches/${branchId}/pickup-location`, `/v1/delivery-quotes/${quoteId}/locations`,
    `/v1/deliveries/${deliveryId}/locations`];
  for (const path of paths) {
    assert.equal((await get(b.token, path)).status, 404);
    assert.equal((await get('', path)).status, 401);
    assert.equal((await get('invalid.token.value', path)).status, 401);
  }
  await withSubject(db, b, async (tx) => {
    assert.equal(await tx.branch.count({ where: { id: branchId } }), 0);
    assert.equal(await tx.pricingQuote.count({ where: { id: quoteId } }), 0);
    assert.equal(await tx.delivery.count({ where: { id: deliveryId } }), 0);
  });
  const branch = await admin.branch.findUniqueOrThrow({ where: { id: branchId } });
  const membership = await admin.membership.findFirstOrThrow({ where: { branchId, subjectId: a.subjectId } });
  for (const scope of ['branch', 'merchant', 'membership'] as const) {
    const change = async (enabled: boolean) => {
      if (scope === 'branch') await admin.branch.update({ where: { id: branchId }, data: { enabled } });
      if (scope === 'merchant') await admin.merchant.update({ where: { id: branch.merchantId }, data: { enabled } });
      if (scope === 'membership') await admin.membership.update({ where: { id: membership.id }, data: { enabled } });
    };
    await change(false);
    try {
      for (const path of paths) assert.equal((await get(a.token, path)).status, 404);
      assert.equal((await quote(a.token)).status, 403);
      assert.equal((await createDelivery(a.token, quoteId)).status, 403);
      await withSubject(db, a, async (tx) => {
        assert.equal(await tx.pricingQuote.count({ where: { id: quoteId } }), 0);
        assert.equal(await tx.delivery.count({ where: { id: deliveryId } }), 0);
      });
    } finally { await change(true); }
  }
});

test('locations: pre-increment JSON remains readable and creates a compatible Delivery', async () => {
  const a = await login();
  const quoteId = await newQuote(a.token);
  const { destination: _destination, ...legacy } = { ...input, pickup: { lat: 0, lng: 0 } };
  await admin.pricingQuote.update({ where: { id: quoteId }, data: { request: legacy } });
  const created = await createDelivery(a.token, quoteId);
  assert.equal(created.status, 201);
  const { deliveryId } = await created.json();
  for (const path of [`/v1/delivery-quotes/${quoteId}/locations`, `/v1/deliveries/${deliveryId}/locations`]) {
    const response = await get(a.token, path);
    assert.equal(response.status, 200);
    const dto = parseDeliveryLocationsResponse(await response.json());
    assert.equal(dto.pickup.source, 'legacy_input');
    assert.equal(dto.dropoff.source, 'legacy_input');
    assert.equal(dto.dropoff.addressLine, null);
    assert.equal(dto.dropoff.instructions, null);
  }
});

test('locations: real PostgreSQL and Auth outages return safe 503 without snapshot diagnostics', async () => {
  const a = await login();
  const unavailableUrl = new URL(required('DATABASE_URL'));
  unavailableUrl.port = '1';
  const unavailable = createDatabase(unavailableUrl.href);
  const auth = createSupabaseAuthenticator(required('SUPABASE_URL'), required('SUPABASE_PUBLISHABLE_KEY'));
  const authDown = createSupabaseAuthenticator('http://127.0.0.1:59999', required('SUPABASE_PUBLISHABLE_KEY'));
  try {
    for (const [database, authenticate] of [[unavailable, auth], [db, authDown]] as const) {
      const handler = createLocationHandler({ ...createLocationRepository(database), authenticate });
      for (const path of [`/v1/branches/${branchId}/pickup-location`, '/v1/delivery-quotes/unknown/locations',
        '/v1/deliveries/unknown/locations']) {
        const response = await handler(new Request(`${base}${path}`, { headers: { authorization: `Bearer ${a.token}` } }));
        assert.equal(response.status, 503);
        assert.equal(response.headers.get('cache-control'), 'no-store');
        assert.deepEqual(await response.json(), { type: 'about:blank', title: 'Servicio temporalmente no disponible.',
          status: 503, code: 'SERVICE_UNAVAILABLE' });
      }
    }
  } finally { await unavailable.$disconnect(); }
});
