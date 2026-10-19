import assert from 'node:assert/strict';
import test from 'node:test';
import { createLocationHandler, type LocationStore } from '../src/modules/locations/location.handler.ts';
import { createQuoteService, QuoteFailure, type QuoteDependencies, type StoredQuote } from '../src/modules/pricing/quote.service.ts';
import { parseRouteSnapshot, serializeRouteSnapshot } from '../src/modules/pricing/route-snapshot.ts';
import { parseDeliveryQuoteRequest } from '@delivery/contracts';

const route = { branchId: 'br_a', pickup: { lat: 0.000001, lng: 0 }, dropoff: { lat: 0.02, lng: 0.02 },
  serviceType: 'local_delivery' as const, destination: { addressLine: 'Calle Sintética 123',
    source: 'synthetic' as const, verification: 'unverified' as const } };
const pickup = { branchId: 'br_a', coordinates: { lat: 0, lng: 0 },
  source: 'branch_record' as const, verification: 'unverified' as const };
const locations = { branchId: 'br_a', pickup: { coordinates: pickup.coordinates,
  source: pickup.source, verification: pickup.verification }, dropoff: { coordinates: route.dropoff,
  ...route.destination, instructions: null } };
const store: LocationStore = { readPickup: async () => pickup,
  readQuoteLocations: async () => locations, readDeliveryLocations: async () => locations };
const paths = ['/v1/branches/br_a/pickup-location', '/v1/delivery-quotes/q_a/locations', '/v1/deliveries/d_a/locations'];
const request = (path: string, method = 'GET') => new Request(`https://synthetic.invalid${path}`, { method });

test('location handler: authenticates each read, validates DTO and avoids caching', async () => {
  const actors: string[] = [];
  const handler = createLocationHandler({ ...store,
    readPickup: async (actor) => { actors.push(actor.subjectId); return pickup; },
    authenticate: async () => ({ subjectId: 'verified-subject' }) });
  for (const path of paths) {
    const response = await handler(request(path));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await response.json(), path === paths[0] ? pickup : locations);
  }
  assert.deepEqual(actors, ['verified-subject']);
  assert.equal((await handler(request(paths[0]!, 'POST'))).status, 405);
  assert.equal((await handler(request('/v1/branches/br_a/locations'))).status, 404);
});

test('location handler: safe 401/404/503 for credentials, hidden rows, auth/DB faults and malformed storage', async () => {
  const unavailable = async () => { throw new Error('postgres secret, address, provider credentials'); };
  for (const path of paths) {
    for (const [overrides, status] of [
      [{ authenticate: async () => null }, 401],
      [{ authenticate: unavailable }, 503],
      [{ readPickup: async () => null, readQuoteLocations: async () => null, readDeliveryLocations: async () => null }, 404],
      [{ readPickup: unavailable, readQuoteLocations: unavailable, readDeliveryLocations: unavailable }, 503],
      [{ readPickup: async () => ({ ...pickup, coordinates: { lat: NaN, lng: 0 } }),
        readQuoteLocations: async () => ({ ...locations, branchId: '' }),
        readDeliveryLocations: async () => ({ ...locations, branchId: '' }) }, 503],
    ] as const) {
      const defaults = { ...store, authenticate: async () => ({ subjectId: 'a' }) };
      const handler = createLocationHandler({ ...defaults, ...overrides });
      const response = await handler(request(path));
      assert.equal(response.status, status);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.doesNotMatch(await response.text(), /postgres|secret|credentials|provider/);
    }
  }
});

function quoteFixture(overrides: Partial<QuoteDependencies> = {}) {
  const saved: StoredQuote[] = [];
  const policy = { baseFeeMinor: 3000, includedDistanceMeters: 2000,
    additionalFeePerStartedKmMinor: 700, maximumRouteMeters: 8000 };
  const dependencies: QuoteDependencies = {
    canQuote: async () => true, resolveRoute: async () => ({ eligible: true, distanceMeters: 3000, policy,
      rateVersion: 'synthetic', trustedPickup: pickup.coordinates }),
    saveQuote: async (quote) => { saved.push(quote); }, now: () => new Date(0), newQuoteId: () => 'q_a',
    ttlMilliseconds: 600000, ...overrides,
  };
  return { quote: createQuoteService(dependencies), saved };
}

test('quote snapshot: server pickup replaces tolerable client rounding; copies before asynchronous routing', async () => {
  const input = { ...route, destination: { ...route.destination } };
  const setup = quoteFixture({ canQuote: async () => { input.destination.addressLine = 'Changed'; return true; } });
  await setup.quote({ subjectId: 'a' }, input);
  const snapshot = setup.saved[0]!.request;
  assert.deepEqual(snapshot.pickup, pickup.coordinates);
  assert.equal(snapshot.pickupOrigin, 'branch_record');
  assert.equal(snapshot.destination?.addressLine, route.destination.addressLine);
  assert.deepEqual(parseRouteSnapshot(serializeRouteSnapshot(snapshot)), snapshot);
  assert.throws(() => parseDeliveryQuoteRequest(snapshot));
  const { destination: _destination, ...legacy } = route;
  assert.deepEqual(parseRouteSnapshot(legacy), legacy);
  assert.throws(() => parseRouteSnapshot({ ...legacy, pickupOrigin: 'client' }));
});

test('quote snapshot: provider and storage faults never yield success or store addresses on denied scope', async () => {
  for (const overrides of [
    { canQuote: async () => false },
    { resolveRoute: async () => { throw new QuoteFailure('ROUTING_UNAVAILABLE'); } },
  ]) {
    const setup = quoteFixture(overrides);
    await assert.rejects(setup.quote({ subjectId: 'a' }, route));
    assert.equal(setup.saved.length, 0);
  }
  await assert.rejects(quoteFixture({ saveQuote: async () => { throw new Error('DB down'); } })
    .quote({ subjectId: 'a' }, route));
});
