import { parseCourierAvailabilityRequest, parseCourierMeResponse } from '@delivery/contracts';
import type { LocalConfig } from '../../config/app-mode.ts';
import { AccountError, type CourierAccountApi, type CourierSession } from '../../ports/courier-account.ts';

export interface HttpOptions {
  /** Abort a request after this many ms and report `timeout`. */
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  now?: () => number;
}

async function problemCode(response: Response): Promise<string | null> {
  try {
    const body: unknown = await response.json();
    return typeof body === 'object' && body !== null && 'code' in body && typeof body.code === 'string' ? body.code : null;
  } catch {
    return null;
  }
}

function errorFor(status: number, code: string | null): AccountError {
  if (status === 401) return new AccountError('unauthenticated', status);
  if (status === 404) return new AccountError('not-enabled', status);
  if (status === 409) return new AccountError(code === 'IDEMPOTENCY_CONFLICT' ? 'idempotency-conflict' : 'version-conflict', status);
  if (status === 400 || status === 422) return new AccountError('invalid', status);
  if (status >= 500) return new AccountError('unavailable', status);
  return new AccountError('unexpected', status);
}

/**
 * Courier identity and availability over HTTP against the local lab. Never logs bodies, tokens
 * or passwords; every response body is validated with the shared contract parsers.
 */
export function createLocalCourierApi(config: LocalConfig, { timeoutMs = 10_000, fetchImpl = fetch, now = Date.now }: HttpOptions = {}): CourierAccountApi {
  async function send(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetchImpl(url, { ...init, signal: controller.signal });
    } catch {
      throw new AccountError(controller.signal.aborted ? 'timeout' : 'offline');
    } finally {
      clearTimeout(timer);
    }
  }

  async function courier(response: Response) {
    if (!response.ok) throw errorFor(response.status, await problemCode(response));
    try {
      return parseCourierMeResponse(await response.json());
    } catch {
      throw new AccountError('unexpected', response.status);
    }
  }

  const bearer = (session: CourierSession) => {
    if (session.expiresAt <= now()) throw new AccountError('unauthenticated');
    return { authorization: `Bearer ${session.accessToken}`, accept: 'application/json' };
  };

  return {
    async signIn(email, password) {
      const response = await send(`${config.authUrl}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { apikey: config.publishableKey, 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      // GoTrue answers wrong email or password with 400 (invalid_grant).
      if (response.status === 400 || response.status === 401) throw new AccountError('invalid-credentials', response.status);
      if (!response.ok) throw errorFor(response.status, null);
      const body: unknown = await response.json().catch(() => null);
      if (typeof body !== 'object' || body === null || !('access_token' in body) || typeof body.access_token !== 'string') {
        throw new AccountError('unexpected', response.status);
      }
      const seconds = 'expires_in' in body && typeof body.expires_in === 'number' ? body.expires_in : 3600;
      return { accessToken: body.access_token, expiresAt: now() + seconds * 1000 };
    },
    async getMe(session) {
      return courier(await send(`${config.apiUrl}/v1/couriers/me`, { headers: bearer(session) }));
    },
    async setAvailability(session, request, idempotencyKey) {
      const body = parseCourierAvailabilityRequest(request);
      return courier(await send(`${config.apiUrl}/v1/couriers/me/availability`, {
        method: 'POST',
        headers: { ...bearer(session), 'content-type': 'application/json', 'idempotency-key': idempotencyKey },
        body: JSON.stringify(body),
      }));
    },
  };
}
