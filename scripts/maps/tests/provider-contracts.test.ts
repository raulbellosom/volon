import assert from 'node:assert/strict';
import test from 'node:test';
import { createProviderAdapter } from '../providers.ts';
import { EvaluationFailure } from '../types.ts';

test('documented search contracts: correct API/filters/language and no hidden follow-up requests', async () => {
  for (const provider of ['geoapify', 'google', 'mapbox'] as const) {
    const requests: { url: URL; init: RequestInit | undefined }[] = [];
    const adapter = createProviderAdapter(provider, 'artificial-key', { fetcher: async (input, init) => {
      requests.push({ url: new URL(String(input)), init });
      return Response.json(provider === 'google' ? {} : provider === 'geoapify' ? { results: [] } : { features: [] });
    } });
    await adapter.execute({ kind: 'autocomplete', query: 'synthetic á&?' });
    assert.equal(requests.length, 1);
    const request = requests[0];
    assert.ok(request);
    assert.equal(request.init?.redirect, 'error');
    assert.ok(request.init?.signal instanceof AbortSignal);
    if (provider === 'geoapify') {
      assert.equal(request.url.pathname, '/v1/geocode/autocomplete');
      assert.equal(request.url.searchParams.get('text'), 'synthetic á&?');
      assert.equal(request.url.searchParams.get('filter'), 'countrycode:mx');
      assert.equal(request.url.searchParams.get('format'), 'json');
      assert.equal(request.url.searchParams.get('lang'), 'es');
      assert.equal(request.url.searchParams.get('limit'), '5');
    } else if (provider === 'google') {
      assert.equal(request.url.hostname, 'places.googleapis.com');
      assert.equal(request.url.pathname, '/v1/places:autocomplete');
      assert.equal(request.init?.method, 'POST');
      assert.deepEqual(JSON.parse(String(request.init?.body)), { input: 'synthetic á&?', includedRegionCodes: ['mx'], languageCode: 'es' });
    } else {
      assert.equal(request.url.pathname, '/search/geocode/v6/forward');
      assert.equal(request.url.searchParams.get('autocomplete'), 'true');
      assert.equal(request.url.searchParams.get('permanent'), 'false');
      assert.equal(request.url.searchParams.get('country'), 'mx');
    }
  }
});

test('route contracts: driving is distinct from moto, metric units forced; wrong units and numeric Google duration rejected', async () => {
  const operation = { kind: 'route' as const, origin: { lat: 1, lng: 2 }, destination: { lat: 3, lng: 4 }, mode: 'driving' as const };
  let inspected = false;
  const geo = createProviderAdapter('geoapify', 'artificial-key', { fetcher: async (input) => {
    const url = new URL(String(input));
    assert.equal(url.searchParams.get('units'), 'metric');
    assert.equal(url.searchParams.get('mode'), 'drive');
    inspected = true;
    return Response.json({ features: [{ properties: { distance: 1, distance_units: 'Miles', time: 3 } }] });
  } });
  await assert.rejects(geo.execute(operation), (error: unknown) => error instanceof EvaluationFailure && error.code === 'invalid_response');
  assert.equal(inspected, true);
  const google = createProviderAdapter('google', 'artificial-key', { fetcher: async () =>
    Response.json({ routes: [{ distanceMeters: 10, duration: 10 }] }) });
  await assert.rejects(google.execute(operation), (error: unknown) => error instanceof EvaluationFailure && error.code === 'invalid_response');
  const mapbox = createProviderAdapter('mapbox', 'artificial-key', { fetcher: async (input) => {
    assert.equal(new URL(String(input)).pathname, '/directions/v5/mapbox/driving/2,1;4,3');
    return Response.json({ code: 'Ok', routes: [{ distance: 10, duration: 3 }] });
  } });
  assert.deepEqual((await mapbox.execute(operation)).result, { kind: 'route', distanceMeters: 10, durationSeconds: 3 });
});

test('embedded errors and missing coordinates: safe classifications with no provider diagnostics exported', async () => {
  for (const [provider, body, expected] of [
    ['google', { status: 'UNKNOWN_ERROR', error_message: 'private diagnostic' }, 'unavailable'],
    ['google', { status: 'OVER_DAILY_LIMIT' }, 'quota'],
    ['geoapify', { results: [{ lon: 2, result_type: 'building' }] }, 'invalid_response'],
    ['geoapify', { error: 'quota private diagnostic', statusCode: 429 }, 'invalid_response'],
    ['mapbox', { features: [{ properties: { feature_type: 'address' }, geometry: {} }] }, 'invalid_response'],
    ['mapbox', { message: 'private diagnostic' }, 'invalid_response'],
  ] as const) {
    const adapter = createProviderAdapter(provider, 'artificial-key', { fetcher: async () => Response.json(body) });
    await assert.rejects(adapter.execute({ kind: 'geocode', query: 'synthetic' }), (error: unknown) =>
      error instanceof EvaluationFailure && error.code === expected && error.attempts === 1
      && !/private diagnostic|artificial-key/.test(error.message));
  }
});
