import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createPreflight } from '../preflight.ts';
import { COST_SCENARIOS } from '../cost.ts';
import { estimateMonthlyCost } from '../monthly-cost.ts';
import { evaluate } from '../runner.ts';
import type { EvaluationAdapter } from '../types.ts';

const bytes = readFileSync('scripts/maps/public-reference-cases.json', 'utf8');

test('preflight: exact hash, complete query inventory, pending routes and bounded search-only cost; no network or secrets in CI', () => {
  const result = spawnSync(process.execPath, ['--experimental-strip-types', '--import',
    'data:text/javascript,globalThis.fetch=()=>{throw new Error("NETWORK MUST NOT RUN")}',
    'scripts/maps/cli.ts', '--preflight'], { encoding: 'utf8', timeout: 10000,
    env: { ...process.env, CI: 'true', MAP_EVAL_REAL: 'enabled', MAP_EVAL_GEOAPIFY_KEY: 'must-not-leak' } });
  assert.equal(result.status, 0, result.stderr);
  const report = result.stdout;
  assert.ok(report.includes(createHash('sha256').update(bytes).digest('hex')));
  assert.match(report, /6 referencias; 17 geocode; 5 autocomplete; 8 rutas PENDIENTES; 0 rutas autorizables/);
  assert.match(report, /Máximo 22 intentos HTTP = 22 créditos/);
  assert.match(report, /USD 0 adicionales estimados SOLO con cuota Free disponible/);
  const proposal = JSON.parse(bytes);
  for (const query of proposal.queryProposals) assert.ok(report.includes(query.query));
  assert.match(report, /ejecución real BLOQUEADA/);
  assert.doesNotMatch(report + result.stderr, /must-not-leak|NETWORK MUST NOT RUN|apiKey=|access_token=/);
});

test('preflight: cannot silently accept approvals, fake tolerances, unknown POIs or token-bearing source URLs', () => {
  const changes = [
    (data: ReturnType<typeof JSON.parse>) => { data.accessPointsReviewed = true; },
    (data: ReturnType<typeof JSON.parse>) => { data.pois[0].accessToleranceMeters = 100; },
    (data: ReturnType<typeof JSON.parse>) => { data.pois[0].referencePoint.lat = 100; },
    (data: ReturnType<typeof JSON.parse>) => { data.queryProposals[0].poi = 'unknown'; },
    (data: ReturnType<typeof JSON.parse>) => { data.queryProposals[1].id = data.queryProposals[0].id; },
    (data: ReturnType<typeof JSON.parse>) => { data.pois[0].coordinateSource = 'https://sic.cultura.gob.mx/?apiKey=secret'; },
    (data: ReturnType<typeof JSON.parse>) => { data.routeProposals[0].status = 'approved'; },
    (data: ReturnType<typeof JSON.parse>) => { data.queryProposals[0].query = 'injected\nlog'; },
  ];
  for (const mutate of changes) {
    const data = JSON.parse(bytes);
    mutate(data);
    assert.throws(() => createPreflight(JSON.stringify(data)));
  }
  assert.throws(() => createPreflight('x'.repeat(1048577)));
});

test('metrics: a reference without approved tolerance measures distance, never invented hits; ambiguity denominator excludes failures', async () => {
  const adapter: EvaluationAdapter = { provider: 'geoapify', execute: async () => ({ attempts: 1,
    result: { kind: 'search', candidates: [
      { point: { lat: 0, lng: 0 }, granularity: 'address', houseNumber: '4' },
      { point: { lat: 0.01, lng: 0 }, granularity: 'street', houseNumber: null },
    ] } }) };
  const report = await evaluate(adapter, [{ id: 'unscored', operation: { kind: 'geocode', query: 'synthetic' },
    reference: { point: { lat: 0, lng: 0 }, toleranceMeters: null } }], { mode: 'simulation' });
  assert.equal(report.metrics[0]?.top1ErrorMeters, 0);
  assert.equal(report.metrics[0]?.top1Match, undefined);
  assert.equal(report.metrics[0]?.topKMatch, undefined);
  assert.equal(report.summary.scored, 0);
  assert.equal(report.summary.searchResponses, 1);
  assert.equal(report.summary.ambiguityPercent, 100);
  const empty: EvaluationAdapter = { provider: 'google', execute: async () => ({ attempts: 1, result: { kind: 'empty' } }) };
  const noResults = await evaluate(empty, [{ id: 'empty', operation: { kind: 'geocode', query: 'synthetic' } }], { mode: 'simulation' });
  assert.equal(noResults.summary.emptyResponses, 1);
  assert.equal(noResults.summary.ambiguityPercent, 0);
});

test('monthly economics: allowances per SKU, Enterprise moto, daily capacity and unavailable moto remain explicit', () => {
  const single = COST_SCENARIOS.single;
  const requote = COST_SCENARIOS.requote;
  assert.ok(single && requote);
  const estimate = (scenario: typeof single, n: number) => estimateMonthlyCost({ ...scenario,
    monthlyDeliveries: n, peakDailyDeliveries: 2 * Math.ceil(n / 30) });
  assert.equal(estimate(single, 100).google.monthlyUsd, 0);
  assert.equal(estimate(single, 3000).google.monthlyUsd, 52.64);
  assert.equal(estimate(requote, 10000).google.monthlyUsd, 1005.1);
  assert.equal(estimate(single, 1000).geoapify.plan?.name, 'Free');
  assert.equal(estimate(single, 3000).geoapify.monthlyUsd, 59);
  assert.equal(estimate(single, 10000).geoapify.monthlyUsd, 109);
  assert.equal(estimate(requote, 10000).geoapify.monthlyUsd, 179);
  assert.equal(estimate(single, 10000).mapbox.monthlyUsd, null);
  assert.equal(estimate(requote, 10000).mapbox.drivingComparisonUsd, 215);
  assert.throws(() => estimateMonthlyCost({ ...single, monthlyDeliveries: 1000000 }));
});
