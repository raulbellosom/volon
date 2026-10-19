import type { QuotePoint } from '../../packages/contracts/src/index.ts';

export type Provider = 'geoapify' | 'google' | 'mapbox';
export type Operation =
  | { readonly kind: 'geocode' | 'autocomplete'; readonly query: string }
  | { readonly kind: 'route'; readonly origin: QuotePoint; readonly destination: QuotePoint;
      readonly mode: 'driving' | 'motorcycle' };
export interface Candidate {
  readonly point: QuotePoint | null;
  readonly granularity: 'address' | 'street' | 'area' | 'unknown';
  readonly houseNumber: string | null;
}
export type EvaluationResult =
  | { readonly kind: 'search'; readonly candidates: readonly Candidate[] }
  | { readonly kind: 'route'; readonly distanceMeters: number; readonly durationSeconds: number }
  | { readonly kind: 'empty' }
  | { readonly kind: 'unsupported' };
export interface Receipt {
  readonly result: EvaluationResult;
  readonly attempts: number;
}
export interface EvaluationAdapter {
  readonly provider: Provider;
  readonly execute: (operation: Operation) => Promise<Receipt>;
}
export type FailureCode = 'auth' | 'quota' | 'timeout' | 'network' | 'invalid_response' | 'unavailable';
export class EvaluationFailure extends Error {
  readonly code: FailureCode;
  readonly attempts: number;
  constructor(code: FailureCode, attempts = 0) {
    super(code);
    this.code = code;
    this.attempts = attempts;
  }
}
export interface EvaluationCase {
  readonly id: string;
  readonly operation: Operation;
  readonly reference?: { readonly point: QuotePoint; readonly toleranceMeters: number | null;
    readonly requiredGranularity?: Candidate['granularity']; readonly houseNumber?: string };
  readonly expectEmpty?: boolean;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
export function validPoint(value: unknown): value is QuotePoint {
  return isRecord(value) && typeof value.lat === 'number' && Number.isFinite(value.lat) && Math.abs(value.lat) <= 90
    && typeof value.lng === 'number' && Number.isFinite(value.lng) && Math.abs(value.lng) <= 180;
}
export function validateOperation(operation: Operation): void {
  if (operation.kind === 'route') {
    if (!validPoint(operation.origin) || !validPoint(operation.destination)
      || !['driving', 'motorcycle'].includes(operation.mode)) throw new Error('Invalid evaluation operation');
  } else if (!['geocode', 'autocomplete'].includes(operation.kind) || typeof operation.query !== 'string'
    || !operation.query.trim() || operation.query.length > 240 || /[\p{Cc}\p{Cs}]/u.test(operation.query)) {
    throw new Error('Invalid evaluation operation');
  }
}
