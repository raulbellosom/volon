import assert from 'node:assert/strict';
import test from 'node:test';
import { createProviderAdapter } from '../providers.ts';
import { syntheticFetch, SYNTHETIC_CASES } from '../fixtures.ts';
import { evaluate } from '../runner.ts';
import { EvaluationFailure, type Operation } from '../types.ts';

const route: Operation = { kind: 'route', origin: { lat: 0, lng: 0 },
  destination: { lat: 0.01, lng: 0.02 }, mode: 'motorcycle' };

test('offline providers: artificial payloads normalize metrics without network, credentials or verification', async () => {
  for (const provider of ['geoapify', 'google', 'mapbox'] as const) {
    const adapter = createProviderAdapter(provider, 'fixture-secret', { fetcher: syntheticFetch(provider) });
    let time = 0;
    const report = await evaluate(adapter, SYNTHETIC_CASES, { mode: 'simulation', clock: () => time++ });
    assert.equal(report.realQueries, 0);
    assert.equal(report.summary.cases, 9);
    assert.equal(report.summary.errors.quota, 1);
    assert.equal(report.summary.errors.network, 1);
    assert.equal(report.summary.errors.invalid_response, 1);
    assert.equal(report.summary.ambiguous, 1);
    assert.equal(report.summary.top1Matches, provider === 'google' ? 1 : 2);
    assert.equal(report.summary.topKMatches, provider === 'google' ? 2 : 3);
    assert.equal(report.summary.p95Ms, 1);
    const moto = report.metrics.find((item) => item.caseId === 'synthetic-moto');
    assert.equal(moto?.status, provider === 'mapbox' ? 'unsupported' : 'ok');
    assert.equal(moto?.attempts, provider === 'mapbox' ? 0 : 1);
    assert.doesNotMatch(JSON.stringify(report), /fixture-secret|coordinates|verification|formatted_address|placeId/);
  }
});

test('providers: explicit moto profiles, lat/lng order, fixed hosts and no implicit Place Details call', async () => {
  for (const provider of ['geoapify', 'google', 'mapbox'] as const) {
    const requests: { url: URL; init: RequestInit | undefined }[] = [];
    const artificial = syntheticFetch(provider);
    const adapter = createProviderAdapter(provider, 'fixture-secret', { fetcher: async (url, init) => {
      requests.push({ url: new URL(String(url)), init });
      return artificial(url, init);
    } });
    await adapter.execute(route);
    if (provider === 'mapbox') { assert.equal(requests.length, 0); continue; }
    const request = requests[0];
    assert.ok(request);
    assert.equal(request.init?.redirect, 'error');
    if (provider === 'geoapify') {
      assert.equal(request.url.hostname, 'api.geoapify.com');
      assert.equal(request.url.searchParams.get('mode'), 'motorcycle');
      assert.equal(request.url.searchParams.get('waypoints'), '0,0|0.01,0.02');
    } else {
      assert.equal(request.url.hostname, 'routes.googleapis.com');
      const body = JSON.parse(String(request.init?.body));
      assert.equal(body.travelMode, 'TWO_WHEELER');
      assert.deepEqual(body.destination.location.latLng, { latitude: 0.01, longitude: 0.02 });
      const receipt = await adapter.execute({ kind: 'autocomplete', query: 'synthetic-prefix' });
      assert.equal(receipt.result.kind, 'search');
      if (receipt.result.kind === 'search') assert.equal(receipt.result.candidates[0]?.point, null);
      assert.equal(requests.length, 2);
    }
  }
});

test('provider parser faults: non-finite/out-of-range coordinates, bad routes and injected fields never leak', async () => {
  for (const [provider, body, operation] of [
    ['geoapify', { results: [{ lat: 91, lon: 0 }] }, { kind: 'geocode', query: 'synthetic' }],
    ['mapbox', { features: [{ geometry: { coordinates: [0, 91] }, properties: {} }] }, { kind: 'geocode', query: 'synthetic' }],
    ['google', { status: 'OK', results: [{ geometry: { location: { lat: null, lng: 0 } }, types: [] }] }, { kind: 'geocode', query: 'synthetic' }],
    ['google', { routes: [{ distanceMeters: 5, duration: 'bad' }] }, route],
    ['geoapify', { features: [{ properties: { distance: -1, time: 5 } }] }, route],
    ['mapbox', { code: 'Ok', routes: [{ distance: null, duration: 3 }] }, { ...route, mode: 'driving' }],
  ] as const) {
    const adapter = createProviderAdapter(provider, 'fixture-secret', { fetcher: async () => Response.json(body) });
    await assert.rejects(adapter.execute(operation), (error: unknown) => error instanceof EvaluationFailure
      && error.code === 'invalid_response' && error.attempts === 1 && !error.message.includes('fixture-secret'));
  }
});

test('providers: quota encoded inside Google HTTP 200 and no-route remain distinct from malformed JSON', async () => {
  const google = createProviderAdapter('google', 'fixture', { fetcher: async () => Response.json({ status: 'OVER_QUERY_LIMIT' }) });
  await assert.rejects(google.execute({ kind: 'geocode', query: 'synthetic' }), (error: unknown) =>
    error instanceof EvaluationFailure && error.code === 'quota' && error.attempts === 1);
  const mapbox = createProviderAdapter('mapbox', 'fixture', { fetcher: async () => Response.json({ code: 'NoRoute' }) });
  assert.deepEqual((await mapbox.execute({ ...route, mode: 'driving' })).result, { kind: 'empty' });
  const error200 = createProviderAdapter('google', 'fixture', { fetcher: async () => Response.json({ error: {
    code: 403, message: 'Must never be printed', status: 'PERMISSION_DENIED' } }) });
  await assert.rejects(error200.execute({ kind: 'autocomplete', query: 'synthetic' }), (error: unknown) =>
    error instanceof EvaluationFailure && error.code === 'auth');
});

test('accuracy: nearby point alone cannot pass a complete address with wrong exterior number or granularity', async () => {
  for (const provider of ['google', 'geoapify', 'mapbox'] as const) {
    const body = provider === 'google' ? { status: 'OK', results: [{ geometry: { location: { lat: 0.01, lng: 0.01 } },
      types: ['street_address'], address_components: [{ types: ['street_number'], long_name: '7' }] }] }
      : provider === 'geoapify' ? { results: [{ lat: 0.01, lon: 0.01, result_type: 'building', housenumber: '7' }] }
        : { features: [{ geometry: { coordinates: [0.01, 0.01] }, properties: {
          feature_type: 'address', context: { address: { address_number: '7' } } } }] };
    const adapter = createProviderAdapter(provider, 'fixture', { fetcher: async () => Response.json(body) });
    const cases = [
      { id: 'wrong-number', operation: { kind: 'geocode' as const, query: 'synthetic' },
        reference: { point: { lat: 0.01, lng: 0.01 }, toleranceMeters: 10, requiredGranularity: 'address' as const, houseNumber: '4' } },
      { id: 'matching-number', operation: { kind: 'geocode' as const, query: 'synthetic' },
        reference: { point: { lat: 0.01, lng: 0.01 }, toleranceMeters: 10, requiredGranularity: 'address' as const, houseNumber: '7' } },
    ];
    const report = await evaluate(adapter, cases, { mode: 'simulation' });
    assert.equal(report.metrics[0]?.top1Match, false);
    assert.equal(report.metrics[0]?.top1HouseNumberMatch, false);
    assert.equal(report.metrics[1]?.top1Match, true);
    assert.equal(report.metrics[1]?.top1ErrorMeters, 0);
    assert.equal(report.metrics[1]?.top1Granularity, 'address');
    assert.equal(report.summary.top1Matches, 1);
    assert.equal(Object.hasOwn(report.metrics[1] ?? {}, 'houseNumber'), false);
  }
});
