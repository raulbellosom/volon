import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { readRealConfiguration } from '../real-config.ts';
import { COST_SCENARIOS, estimateCost } from '../cost.ts';
import { validateCases } from '../runner.ts';
import { SYNTHETIC_CASES } from '../fixtures.ts';

const manifest = JSON.stringify({ publicNonResidential: true, accessPointsReviewed: true,
  approvalReference: 'synthetic-test-approval', cases: [{ id: 'synthetic', sources: ['https://synthetic.invalid/reference'],
    operation: { kind: 'geocode', query: 'synthetic' }, reference: { point: { lat: 0, lng: 0 }, toleranceMeters: 10 } }] });
const env = { MAP_EVAL_REAL: 'enabled', MAP_EVAL_ADMIN_APPROVED: 'yes', MAP_EVAL_LICENSE_APPROVED: 'yes',
  MAP_EVAL_PROVIDER: 'geoapify', MAP_EVAL_GEOAPIFY_KEY: 'fixture', MAP_EVAL_MAX_REQUESTS: '1',
  MAP_EVAL_DATASET_SHA256: createHash('sha256').update(manifest).digest('hex') };

test('real gate: rejects CI, implicit credentials, missing approvals, modified dataset and invalid limits', () => {
  assert.throws(() => readRealConfiguration({}, manifest));
  for (const key of Object.keys(env)) assert.throws(() => readRealConfiguration({ ...env, [key]: '' }, manifest));
  assert.throws(() => readRealConfiguration({ ...env, CI: 'false' }, manifest));
  assert.throws(() => readRealConfiguration({ ...env, GITHUB_ACTIONS: 'true' }, manifest));
  assert.throws(() => readRealConfiguration({ ...env, MAP_EVAL_MAX_REQUESTS: '1001' }, manifest));
  assert.throws(() => readRealConfiguration(env, manifest + ' '));
  const config = readRealConfiguration(env, manifest);
  assert.equal(config.provider, 'geoapify');
  assert.equal(config.cases.length, 1);
});

test('cases: duplicate IDs, invalid points and unjustified tolerances rejected before transport', () => {
  const first = SYNTHETIC_CASES[0];
  assert.ok(first);
  assert.throws(() => validateCases([first, first]));
  assert.throws(() => validateCases([{ ...first, reference: { point: { lat: 91, lng: 0 }, toleranceMeters: 10 } }]));
  assert.throws(() => validateCases([{ ...first, reference: { point: { lat: 0, lng: 0 }, toleranceMeters: 0 } }]));
});

test('costs: full-session assumptions, tiles counted once, moto limitation, requotes and plan capacity', () => {
  const single = COST_SCENARIOS.single;
  const requote = COST_SCENARIOS.requote;
  assert.ok(single && requote);
  const google = estimateCost('google', single);
  assert.ok(google.usdPerDelivery !== null);
  assert.ok(Math.abs(google.usdPerDelivery - 0.05398) < 0.0000001);
  const repeated = estimateCost('google', requote).usdPerDelivery;
  assert.ok(repeated !== null && repeated > google.usdPerDelivery);
  const mapbox = estimateCost('mapbox', single);
  assert.equal(mapbox.usdPerDelivery, null);
  const carCost = estimateCost('mapbox', { ...single, mode: 'driving' }).usdPerDelivery;
  assert.ok(carCost !== null && Math.abs(carCost - 0.0215) < 0.0000001);
  const geoapify = estimateCost('geoapify', single);
  assert.equal(geoapify.creditsPerDelivery, 21.5);
  assert.equal(geoapify.fitsApi10DailyCredits, true);
  assert.equal(estimateCost('geoapify', { ...single, peakDailyDeliveries: 1000 }).fitsApi10DailyCredits, false);
  assert.throws(() => estimateCost('google', { ...single, routes: -1 }));
  assert.throws(() => estimateCost('google', { ...single, monthlyDeliveries: 0 }));
});
