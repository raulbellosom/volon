import assert from 'node:assert/strict';
import test from 'node:test';
import type { DeliveryQuoteRequest } from '@delivery/contracts';
import { QuoteFailure } from '../src/modules/pricing/quote.service.ts';
import { createRoadEligibilityService, type RoadEligibilityDependencies } from
  '../src/modules/routing/road-eligibility.service.ts';

const actor = { subjectId: 'synthetic-subject' };
const trustedPickup = { lat: 20.641, lng: -105.227 };
const request: DeliveryQuoteRequest = {
  branchId: 'branch_synthetic', pickup: trustedPickup,
  dropoff: { lat: 20.630, lng: -105.230 }, serviceType: 'local_delivery',
};
const validLeg = {
  source: 'road-network' as const, provider: 'osrm',
  distanceMeters: 3100, estimatedDurationSeconds: 600,
};

function fixture(overrides: Partial<RoadEligibilityDependencies> = {}) {
  let roadCalls = 0;
  let coverageCalls = 0;
  const deps: RoadEligibilityDependencies = {
    canQuote: async () => true,
    inspectCoverage: async () => {
      coverageCalls++;
      return {
        trustedPickup, pickupMatches: true,
        pickupCovered: true, dropoffCovered: true,
      };
    },
    resolveRoadRoute: async (pickup) => {
      roadCalls++;
      assert.deepEqual(pickup, trustedPickup);
      return validLeg;
    },
    maximumRouteMeters: 8000,
    coverageVersion: 'synthetic-area-v1',
    ...overrides,
  };
  return { run: createRoadEligibilityService(deps),
    roadCalls: () => roadCalls, coverageCalls: () => coverageCalls };
}

async function fails(run: ReturnType<typeof createRoadEligibilityService>,
  code: QuoteFailure['code']) {
  await assert.rejects(run(actor, request), (error: unknown) =>
    error instanceof QuoteFailure && error.code === code);
}

test('road eligibility: trusted branch origin and route, without commercial price/ETA', async () => {
  const x = fixture();
  const result = await x.run(actor, request);
  assert.deepEqual(result, { route: validLeg, coverageVersion: 'synthetic-area-v1' });
  assert.ok(Object.isFrozen(result) && Object.isFrozen(result.route));
  assert.equal(x.roadCalls(), 1);
});

test('road eligibility: no authorization means no coverage check or provider call', async () => {
  const x = fixture({ canQuote: async () => false });
  await fails(x.run, 'ACCESS_DENIED');
  assert.equal(x.coverageCalls(), 0);
  assert.equal(x.roadCalls(), 0);
});

test('road eligibility: forged pickup or uncovered locations never reach provider', async () => {
  for (const field of ['pickupMatches', 'pickupCovered', 'dropoffCovered'] as const) {
    const x = fixture({ inspectCoverage: async () => ({
      trustedPickup, pickupMatches: true, pickupCovered: true,
      dropoffCovered: true, [field]: false,
    }) });
    await fails(x.run, 'OUTSIDE_COVERAGE');
    assert.equal(x.roadCalls(), 0);
  }
});

test('road eligibility: checks distance returned by road provider', async () => {
  const x = fixture({ resolveRoadRoute: async () => ({ ...validLeg, distanceMeters: 8001 }) });
  await fails(x.run, 'OUTSIDE_COVERAGE');
});

test('road eligibility: bad provider data and errors fail closed', async () => {
  const cases = [
    async () => { throw Error('sensitive response'); },
    async () => ({ ...validLeg, distanceMeters: NaN }),
    async () => ({ ...validLeg, source: 'geodesic' as 'road-network' }),
    async () => ({ ...validLeg, estimatedDurationSeconds: -1 }),
    async () => ({ ...validLeg, provider: '' }),
  ];
  for (const resolveRoadRoute of cases) {
    await fails(fixture({ resolveRoadRoute }).run, 'ROUTING_UNAVAILABLE');
  }
  const x = fixture({ inspectCoverage: async () => { throw Error('internal database secret'); } });
  await fails(x.run, 'ROUTING_UNAVAILABLE');
  assert.equal(x.roadCalls(), 0);
});

test('road eligibility: only bounded and versioned policies are accepted', () => {
  for (const maximumRouteMeters of [0, -1, NaN, Infinity, 1.5]) {
    assert.throws(() => fixture({ maximumRouteMeters }), RangeError);
  }
  for (const coverageVersion of ['', 'bad version', 'x'.repeat(65)]) {
    assert.throws(() => fixture({ coverageVersion }), RangeError);
  }
});
