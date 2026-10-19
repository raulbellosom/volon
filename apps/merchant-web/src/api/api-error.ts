/** What the screen should do about a failed request; the HTTP details stay here. */
export type ApiErrorKind =
  | 'unauthenticated'
  | 'forbidden'
  | 'not-found'
  | 'invalid'
  | 'quote-expired'
  | 'conflict'
  | 'unavailable'
  | 'offline'
  | 'unexpected';

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | null;
  /** Stable code from the problem+json body, e.g. `QUOTE_EXPIRED`. */
  readonly code: string | null;

  constructor(kind: ApiErrorKind, status: number | null = null, code: string | null = null) {
    super(`${kind}${code ? ` (${code})` : ''}`);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
    this.code = code;
  }
}

/** Maps an HTTP status and problem code to a kind the UI understands. */
export function errorKindFor(status: number, code: string | null): ApiErrorKind {
  if (code === 'QUOTE_EXPIRED') return 'quote-expired';
  if (status === 401) return 'unauthenticated';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not-found';
  if (status === 400 || status === 422) return 'invalid';
  if (status === 409) return 'conflict';
  if (status >= 500) return 'unavailable';
  return 'unexpected';
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return new ApiError('offline');
  if (error instanceof TypeError) return new ApiError('offline');
  return new ApiError('unexpected');
}
