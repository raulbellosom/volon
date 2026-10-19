import { createHash } from 'node:crypto';
import { isRecord, validPoint, type EvaluationCase, type Operation, type Provider } from './types.ts';
import { validateCases } from './runner.ts';

function denied(): never { throw new Error('Real evaluation requires explicit approvals, a reviewed manifest and server credentials'); }
function parseOperation(value: unknown): Operation {
  if (!isRecord(value)) return denied();
  if (value.kind === 'route' && validPoint(value.origin) && validPoint(value.destination)
    && (value.mode === 'driving' || value.mode === 'motorcycle')) {
    return { kind: value.kind, origin: value.origin, destination: value.destination, mode: value.mode };
  }
  if ((value.kind === 'geocode' || value.kind === 'autocomplete') && typeof value.query === 'string') {
    return { kind: value.kind, query: value.query };
  }
  return denied();
}

/** Pure gate: it cannot load an env file, issue HTTP, write a report or approve a dataset. */
export function readRealConfiguration(env: Readonly<Record<string, string | undefined>>, manifestBytes: string) {
  if (env.CI !== undefined || env.GITHUB_ACTIONS !== undefined || env.MAP_EVAL_REAL !== 'enabled'
    || env.MAP_EVAL_ADMIN_APPROVED !== 'yes' || env.MAP_EVAL_LICENSE_APPROVED !== 'yes') denied();
  const provider = env.MAP_EVAL_PROVIDER;
  if (provider !== 'google' && provider !== 'geoapify' && provider !== 'mapbox') denied();
  const hash = createHash('sha256').update(manifestBytes).digest('hex');
  if (hash !== env.MAP_EVAL_DATASET_SHA256) denied();
  const key = env[`MAP_EVAL_${provider.toUpperCase()}_KEY`];
  const maximum = Number(env.MAP_EVAL_MAX_REQUESTS);
  if (!key?.trim() || !Number.isSafeInteger(maximum) || maximum < 1 || maximum > 1000) denied();
  let manifest: unknown;
  try { manifest = JSON.parse(manifestBytes); } catch { return denied(); }
  if (!isRecord(manifest) || manifest.publicNonResidential !== true
    || typeof manifest.approvalReference !== 'string' || !/^[A-Za-z0-9_/#.-]{1,128}$/.test(manifest.approvalReference)
    || !Array.isArray(manifest.cases)) denied();
  const observationalManifest = manifest.schemaVersion === 2;
  if (manifest.schemaVersion !== undefined && !observationalManifest) denied();
  if (observationalManifest ? manifest.searchReferencesReviewed !== true : manifest.accessPointsReviewed !== true) denied();
  const cases: EvaluationCase[] = manifest.cases.map((item: unknown) => {
    if (!isRecord(item) || typeof item.id !== 'string' || !Array.isArray(item.sources) || !item.sources.length
      || !item.sources.every((source: unknown) => typeof source === 'string' && /^https:\/\//.test(source))) denied();
    const operation = parseOperation(item.operation);
    if (operation.kind === 'route' && manifest.accessPointsReviewed !== true) denied();
    let reference: EvaluationCase['reference'];
    if (item.reference !== undefined) {
      if (!isRecord(item.reference) || !validPoint(item.reference.point)
        || (typeof item.reference.toleranceMeters !== 'number'
          && !(observationalManifest && item.reference.toleranceMeters === null))) denied();
      const granularity = item.reference.requiredGranularity;
      if (granularity !== undefined && granularity !== 'address' && granularity !== 'street' && granularity !== 'area') denied();
      if (item.reference.houseNumber !== undefined && typeof item.reference.houseNumber !== 'string') denied();
      reference = { point: item.reference.point, toleranceMeters: item.reference.toleranceMeters,
        ...(granularity ? { requiredGranularity: granularity } : {}),
        ...(typeof item.reference.houseNumber === 'string' ? { houseNumber: item.reference.houseNumber } : {}) };
    }
    if (item.expectEmpty !== undefined && typeof item.expectEmpty !== 'boolean') denied();
    if (item.observationalOnly !== undefined && typeof item.observationalOnly !== 'boolean') denied();
    if (item.observationalOnly === true && reference && reference.toleranceMeters !== null) denied();
    if (operation.kind !== 'route' && (!reference || reference.toleranceMeters === null) && item.expectEmpty !== true
      && !(observationalManifest && item.observationalOnly === true)) denied();
    return { id: item.id, operation, ...(reference ? { reference } : {}),
      ...(typeof item.expectEmpty === 'boolean' ? { expectEmpty: item.expectEmpty } : {}) };
  });
  validateCases(cases);
  if (maximum < cases.length) denied();
  return { provider: provider as Provider, key, maximum, cases, datasetHash: hash };
}
