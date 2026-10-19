import { EvaluationFailure, validPoint, validateOperation,
  type EvaluationAdapter, type EvaluationCase, type FailureCode } from './types.ts';

export interface CaseMetric {
  readonly caseId: string;
  readonly operation: 'geocode' | 'autocomplete' | 'route';
  readonly status: 'ok' | 'empty' | 'unsupported' | FailureCode;
  readonly attempts: number;
  readonly latencyMs: number;
  readonly candidateCount?: number;
  readonly top1Match?: boolean;
  readonly topKMatch?: boolean;
  readonly emptyExpectationMet?: boolean;
  readonly top1ErrorMeters?: number;
  readonly top1Granularity?: string;
  readonly top1HouseNumberMatch?: boolean;
  readonly distanceMeters?: number;
  readonly durationSeconds?: number;
}

/** Evaluation distance to an explicit reference, NEVER a substitute for road routing. */
export function referenceDistance(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const h = Math.sin(radians(b.lat - a.lat) / 2) ** 2
    + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(radians(b.lng - a.lng) / 2) ** 2;
  return 6371008.8 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}

export function validateCases(cases: readonly EvaluationCase[]): void {
  if (!Array.isArray(cases) || !cases.length || cases.length > 100) throw new Error('Invalid evaluation cases');
  const ids = new Set<string>();
  for (const item of cases) {
    if (!/^[a-z0-9_-]{1,64}$/.test(item.id) || ids.has(item.id)) throw new Error('Invalid evaluation case id');
    ids.add(item.id);
    validateOperation(item.operation);
    if (item.reference && (!validPoint(item.reference.point) || (item.reference.toleranceMeters !== null
      && (!Number.isFinite(item.reference.toleranceMeters) || item.reference.toleranceMeters <= 0
        || item.reference.toleranceMeters > 1000)))) throw new Error('Invalid evaluation reference');
    if (item.reference?.requiredGranularity !== undefined
      && !['address', 'street', 'area', 'unknown'].includes(item.reference.requiredGranularity)) throw new Error('Invalid granularity');
    if (item.reference?.houseNumber !== undefined && (typeof item.reference.houseNumber !== 'string'
      || !/^[A-Za-z0-9 .\/-]{1,24}$/.test(item.reference.houseNumber))) throw new Error('Invalid house number');
    if (item.expectEmpty !== undefined && typeof item.expectEmpty !== 'boolean') throw new Error('Invalid expectation');
  }
}

export async function evaluate(adapter: EvaluationAdapter, cases: readonly EvaluationCase[], options: {
  readonly mode: 'simulation' | 'real';
  readonly clock?: () => number;
  readonly pause?: () => Promise<void>;
}) {
  validateCases(cases);
  const clock = options.clock ?? performance.now.bind(performance);
  const metrics: CaseMetric[] = [];
  for (const item of cases) {
    const started = clock();
    try {
      const { result, attempts } = await adapter.execute(item.operation);
      const base = { caseId: item.id, operation: item.operation.kind, attempts,
        latencyMs: Math.max(0, clock() - started) };
      if (result.kind === 'unsupported') metrics.push({ ...base, status: 'unsupported' });
      else if (result.kind === 'route') metrics.push({ ...base, status: 'ok',
        distanceMeters: result.distanceMeters, durationSeconds: result.durationSeconds });
      else {
        const candidates = result.kind === 'search' ? result.candidates : [];
        const reference = item.reference;
        const tolerance = reference?.toleranceMeters;
        const matches = reference && tolerance !== null && tolerance !== undefined ? candidates.map((candidate) => candidate.point !== null
          && referenceDistance(candidate.point, reference.point) <= tolerance
          && (!reference.requiredGranularity || reference.requiredGranularity === candidate.granularity)
          && (!reference.houseNumber || reference.houseNumber.trim().toUpperCase() === candidate.houseNumber)) : null;
        // Unlocated predictions (e.g. Google) cannot be scored as misses.
        const scoreable = matches && candidates.every((candidate) => candidate.point !== null);
        const firstPoint = candidates[0]?.point;
        metrics.push({ ...base, status: candidates.length ? 'ok' : 'empty', candidateCount: candidates.length,
          ...(candidates[0] ? { top1Granularity: candidates[0].granularity } : {}),
          ...(reference?.houseNumber ? { top1HouseNumberMatch:
            reference.houseNumber.trim().toUpperCase() === candidates[0]?.houseNumber } : {}),
          ...(reference && firstPoint ? { top1ErrorMeters: referenceDistance(firstPoint, reference.point) } : {}),
          ...(scoreable ? { top1Match: matches[0] ?? false, topKMatch: matches.some(Boolean) } : {}),
          ...(item.expectEmpty !== undefined ? { emptyExpectationMet: item.expectEmpty === (candidates.length === 0) } : {}) });
      }
    } catch (error) {
      metrics.push({ caseId: item.id, operation: item.operation.kind,
        status: error instanceof EvaluationFailure ? error.code : 'invalid_response',
        attempts: error instanceof EvaluationFailure ? error.attempts : 0,
        latencyMs: Math.max(0, clock() - started) });
    }
    await options.pause?.();
  }
  const supported = metrics.filter((item) => item.status !== 'unsupported');
  const latencies = supported.map((item) => item.latencyMs).sort((a, b) => a - b);
  const percentile = (p: number) => latencies[Math.max(0, Math.ceil(latencies.length * p) - 1)] ?? null;
  const errors: Partial<Record<FailureCode, number>> = {};
  const searches = metrics.filter((item) => item.candidateCount !== undefined);
  const ambiguous = searches.filter((item) => (item.candidateCount ?? 0) > 1).length;
  for (const item of metrics) {
    if (!['ok', 'empty', 'unsupported'].includes(item.status)) {
      const code = item.status as FailureCode;
      errors[code] = (errors[code] ?? 0) + 1;
    }
  }
  return { provider: adapter.provider, mode: options.mode, realQueries: options.mode === 'real'
    ? metrics.reduce((sum, item) => sum + item.attempts, 0) : 0,
  summary: { cases: metrics.length, supported: supported.length,
    attempts: metrics.reduce((sum, item) => sum + item.attempts, 0),
    technicalSuccesses: supported.filter((item) => ['ok', 'empty'].includes(item.status)).length,
    ambiguous, searchResponses: searches.length,
    ambiguityPercent: searches.length ? 100 * ambiguous / searches.length : null,
    emptyResponses: searches.filter((item) => item.status === 'empty').length,
    scored: metrics.filter((item) => item.top1Match !== undefined).length,
    top1Matches: metrics.filter((item) => item.top1Match === true).length,
    topKMatches: metrics.filter((item) => item.topKMatch === true).length,
    p50Ms: percentile(0.5), p95Ms: percentile(0.95), errors }, metrics };
}
