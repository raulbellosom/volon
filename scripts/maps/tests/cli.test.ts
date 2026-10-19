import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { readRealConfiguration } from '../real-config.ts';

test('CLI: default and explicit offline mode run inside CI with global network blocked', () => {
  for (const args of [[], ['--offline']]) {
    const result = spawnSync(process.execPath, ['--experimental-strip-types', '--import',
      'data:text/javascript,globalThis.fetch=()=>{throw new Error("NETWORK MUST NOT RUN")}',
      'scripts/maps/cli.ts', ...args], {
      encoding: 'utf8', timeout: 10000,
      env: { ...process.env, CI: 'true', MAP_EVAL_REAL: 'enabled', MAP_EVAL_GEOAPIFY_KEY: 'must-not-leak' },
    });
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(result.stdout);
    assert.equal(report.realQueries, 0);
    assert.equal(report.reports.length, 3);
    assert.ok(report.reports.every((row: { mode: string }) => row.mode === 'simulation'));
    assert.doesNotMatch(result.stdout + result.stderr, /must-not-leak|NETWORK MUST NOT RUN/);
  }
});

test('CLI: real mode blocked in CI before reading a manifest or making requests', () => {
  const result = spawnSync(process.execPath, ['--experimental-strip-types', 'scripts/maps/cli.ts', '--real',
    '--manifest', 'nonexistent-sensitive-path'], {
    encoding: 'utf8', env: { ...process.env, CI: 'true' }, timeout: 10000,
  });
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.doesNotMatch(result.stderr, /nonexistent-sensitive-path|ENOENT|stack/);
});

test('public reference dataset: access review absent and tolerances unknown, cannot be treated as approved manifest', () => {
  const bytes = readFileSync('scripts/maps/public-reference-cases.json', 'utf8');
  const dataset = JSON.parse(bytes);
  assert.equal(dataset.accessPointsReviewed, false);
  assert.ok(dataset.pois.every((poi: { accessToleranceMeters: unknown; coordinateSource: string }) =>
    poi.accessToleranceMeters === null && poi.coordinateSource.startsWith('https://')));
  assert.throws(() => readRealConfiguration({}, bytes));
});
