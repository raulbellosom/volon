import assert from 'node:assert/strict';
import test from 'node:test';
import { createOsrmRoadRouter, RoadRoutingError } from '../src/infrastructure/osrm-road.adapter.ts';

const pickup = { lat: 20.65, lng: -105.22 };
const dropoff = { lat: 20.64, lng: -105.24 };
const config = { baseUrl: 'https://routing.example.test/' };

test('road router: parses a simulated OSRM road route without claiming an ETA', async () => {
  let requested = '';
  const fetcher: typeof fetch = async (input, init) => {
    requested = String(input);
    assert.ok(init?.signal, 'Requests must have an abort deadline');
    return Response.json({ code: 'Ok', routes: [{ distance: 1734.2, duration: 482.6 }] });
  };
  const route = await createOsrmRoadRouter({ ...config, fetcher })(pickup, dropoff);
  assert.deepEqual(route, {
    source: 'road-network', provider: 'osrm',
    distanceMeters: 1735, estimatedDurationSeconds: 483,
  });
  const url = new URL(requested);
  assert.equal(url.pathname, '/route/v1/driving/-105.22,20.65;-105.24,20.64');
  assert.equal(url.searchParams.get('overview'), 'false');
  assert.equal(url.searchParams.get('steps'), 'false');
});

test('road router: unreachable network has a distinct safe failure', async () => {
  const fetcher: typeof fetch = async () => { throw new Error('internal host and secret'); };
  const run = createOsrmRoadRouter({ ...config, fetcher });
  await assert.rejects(run(pickup, dropoff), (error: unknown) =>
    error instanceof RoadRoutingError && error.reason === 'UNAVAILABLE'
    && !error.message.includes('secret'));
});

test('road router: malformed, HTTP error and non-finite responses fail closed', async () => {
  const responses = [
    Response.json({ code: 'Ok', routes: [] }),
    Response.json({ code: 'Ok', routes: [{ distance: -1, duration: 4 }] }),
    Response.json({ code: 'Ok', routes: [{ distance: '900', duration: 4 }] }),
    Response.json({ code: 'Ok', routes: [{ distance: 900, duration: null }] }),
    Response.json({ code: 'InternalError' }),
    new Response('service unavailable', { status: 503 }),
    new Response('not-json', { status: 200 }),
  ];
  for (const response of responses) {
    const run = createOsrmRoadRouter({ ...config, fetcher: async () => response.clone() });
    await assert.rejects(run(pickup, dropoff), (error: unknown) =>
      error instanceof RoadRoutingError && error.reason === 'UNAVAILABLE');
  }
});

test('road router: no connected route is distinct from an outage', async () => {
  const run = createOsrmRoadRouter({
    ...config, fetcher: async () => Response.json({ code: 'NoRoute', routes: [] }),
  });
  await assert.rejects(run(pickup, dropoff), (error: unknown) =>
    error instanceof RoadRoutingError && error.reason === 'NO_ROUTE');
});

test('road router: untrusted endpoints, invalid coordinates and deadlines are refused', async () => {
  for (const baseUrl of ['http://routing.example.test/', 'file:///tmp',
    'https://user:pass@routing.example.test/', 'https://routing.example.test/other']) {
    assert.throws(() => createOsrmRoadRouter({ baseUrl }), RangeError);
  }
  for (const timeoutMilliseconds of [0, 30001, NaN, 1.5]) {
    assert.throws(() => createOsrmRoadRouter({ ...config, timeoutMilliseconds }), RangeError);
  }
  const run = createOsrmRoadRouter({
    ...config, fetcher: async () => { throw new Error('Should not be called'); },
  });
  await assert.rejects(run({ lat: 95, lng: 0 }, dropoff), RangeError);
});
