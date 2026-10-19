import { ApiError, errorKindFor, toApiError } from './api-error.ts';

export interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  headers?: Record<string, string>;
  /** Milliseconds before the request is abandoned and reported as unavailable. */
  timeoutMs?: number;
}

async function problemCode(response: Response): Promise<string | null> {
  try {
    const body: unknown = await response.json();
    if (typeof body === 'object' && body !== null && 'code' in body && typeof body.code === 'string') return body.code;
  } catch {
    // Not JSON: the status alone decides the kind.
  }
  return null;
}

/** JSON over fetch with problem+json errors mapped to `ApiError`. Same-origin paths only. */
export async function requestJson(path: string, { method = 'GET', body, headers = {}, timeoutMs = 15000 }: RequestOptions = {}): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      headers: { accept: 'application/json', ...(body === undefined ? {} : { 'content-type': 'application/json' }), ...headers },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'TimeoutError') throw new ApiError('unavailable');
    throw toApiError(error);
  }
  if (!response.ok) {
    const code = await problemCode(response);
    throw new ApiError(errorKindFor(response.status, code), response.status, code);
  }
  try {
    return await response.json();
  } catch {
    throw new ApiError('unexpected', response.status, 'MALFORMED_RESPONSE');
  }
}
