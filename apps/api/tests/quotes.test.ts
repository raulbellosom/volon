import assert from 'node:assert/strict';
import test from 'node:test';
import { createApi, type ApiDependencies } from '../src/app.ts';
import { QuoteFailure, type StoredQuote } from '../src/modules/pricing/quote.service.ts';

const payload = { branchId: 'br_synthetic', pickup: { lat: 0, lng: 0 },
  dropoff: { lat: 1, lng: 1 }, serviceType: 'local_delivery' };
const policy = { baseFeeMinor: 3000, includedDistanceMeters: 2000,
  additionalFeePerStartedKmMinor: 700, maximumRouteMeters: 8000 };

function fixture(overrides: Partial<ApiDependencies> = {}) {
  const saved: StoredQuote[] = [];
  let routeCalls = 0;
  const dependencies: ApiDependencies = {
    authenticate: async () => ({ subjectId: 'user_synthetic' }),
    canQuote: async (actor, branchId) => actor.subjectId === 'user_synthetic' && branchId === 'br_synthetic',
    resolveRoute: async () => {
      routeCalls++;
      return { eligible: true, distanceMeters: 2001, policy, rateVersion: 'synthetic-v1' };
    },
    saveQuote: async (quote) => { saved.push(quote); },
    now: () => new Date('2026-10-17T00:00:00Z'),
    newQuoteId: () => 'quote_synthetic',
    ttlMilliseconds: 600000,
    ...overrides,
  };
  return { api: createApi(dependencies), saved, routeCalls: () => routeCalls };
}

function request(body: unknown = payload, contentType = 'application/json') {
  return new Request('https://synthetic.invalid/v1/delivery-quotes', {
    method: 'POST', headers: { 'content-type': contentType }, body: JSON.stringify(body),
  });
}

test('quote API: stores a scoped versioned snapshot before returning server-calculated breakdown and TTL', async () => {
  const { api, saved } = fixture();
  const response = await api(request());
  assert.equal(response.status, 201);
  const body = await response.json();
  assert.deepEqual(body, { quoteId: 'quote_synthetic', expiresAt: '2026-10-17T00:10:00.000Z',
    currency: 'MXN', amountMinor: 3700, lines: [
      { code: 'base_delivery', amountMinor: 3000 }, { code: 'distance_delivery', amountMinor: 700 },
    ], coverage: 'eligible' });
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(saved.length, 1);
  assert.equal(saved[0]?.subjectId, 'user_synthetic');
  assert.equal(saved[0]?.branchId, payload.branchId);
  assert.equal(saved[0]?.rateVersion, 'synthetic-v1');
  assert.deepEqual(saved[0]?.response, body);
  assert.ok(Object.isFrozen(saved[0]?.response.lines));
});

test('quote API: unauthenticated and cross-branch requests never route or store', async () => {
  for (const [overrides, body, status] of [
    [{ authenticate: async () => null }, payload, 401],
    [{}, { ...payload, branchId: 'br_other' }, 403],
  ] as const) {
    const setup = fixture(overrides);
    const response = await setup.api(request(body));
    assert.equal(response.status, status);
    assert.equal(setup.routeCalls(), 0);
    assert.equal(setup.saved.length, 0);
    assert.equal(response.headers.get('content-type'), 'application/problem+json');
  }
});

test('quote API: rejects invalid JSON, media type and injected prices before routing', async () => {
  const setup = fixture();
  for (const [input, status] of [
    [new Request('https://synthetic.invalid/v1/delivery-quotes', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: '{',
    }), 400],
    [request(payload, 'text/plain'), 415],
    [request({ ...payload, routeDistanceMeters: 1 }), 422],
    [request({ ...payload, pickup: { lat: 91, lng: 0 } }), 422],
  ] as const) assert.equal((await setup.api(input)).status, status);
  assert.equal(setup.routeCalls(), 0);
  assert.equal(setup.saved.length, 0);
});

test('quote API: outside coverage or maximum route cannot issue a quote', async () => {
  for (const route of [
    { eligible: false, distanceMeters: 1, policy, rateVersion: 'v1' },
    { eligible: true, distanceMeters: 8001, policy, rateVersion: 'v1' },
  ]) {
    const setup = fixture({ resolveRoute: async () => route });
    const response = await setup.api(request());
    assert.equal(response.status, 422);
    assert.equal((await response.json()).code, 'OUTSIDE_COVERAGE');
    assert.equal(setup.saved.length, 0);
  }
});

test('quote API: storage, authorization and routing failures never report success or leak details', async () => {
  const failure = async () => { throw new Error('secret provider payload'); };
  for (const overrides of [{ saveQuote: failure }, { canQuote: failure }, { resolveRoute: failure },
    { resolveRoute: async () => { throw new QuoteFailure('ROUTING_UNAVAILABLE'); } },
    { resolveRoute: async () => ({ eligible: true, distanceMeters: NaN, policy, rateVersion: 'v1' }) }]) {
    const setup = fixture(overrides);
    const response = await setup.api(request());
    assert.equal(response.status, 503);
    assert.ok(!(await response.text()).includes('secret'));
    assert.equal(setup.saved.length, 0);
  }
});

test('quote API: explicit routing and valid configuration required', async () => {
  const { api } = fixture();
  const method = await api(new Request('https://synthetic.invalid/v1/delivery-quotes'));
  assert.equal(method.status, 405);
  assert.equal(method.headers.get('allow'), 'POST');
  assert.equal((await api(new Request('https://synthetic.invalid/v1/missing'))).status, 404);
  for (const ttlMilliseconds of [0, -1, NaN, Infinity, 0.5]) {
    assert.throws(() => fixture({ ttlMilliseconds }), RangeError);
  }
});
