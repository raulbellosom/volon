import { AccountError, type AccountErrorKind, type CourierAccountApi, type CourierAvailabilityRequest, type CourierMeResponse } from '../ports/courier-account.ts';

/** Test-only placeholder credentials; nothing here matches the real lab. */
export const FAKE_EMAIL = 'courier-test@example.test';
export const FAKE_PASSWORD = 'not-a-real-password';

export type FakeFailure =
  | AccountErrorKind
  /** The server applies the command but the reply is lost (the outcome is unknown to the app). */
  | 'lost-reply';

/**
 * In-memory stand-in for the courier endpoints with the backend's semantics (issue #16): CAS on
 * `expectedVersion`, idempotency receipts that replay the original answer, and revocation.
 */
export function createFakeCourierApi() {
  let me: CourierMeResponse = { courierId: 'courier_test_a', availability: { status: 'offline', version: 1, changedAt: '2026-10-19T15:00:00.000Z' } };
  let enabled = true;
  let clock = Date.parse('2026-10-19T15:00:00.000Z');
  const receipts = new Map<string, { payload: string; result: CourierMeResponse }>();
  const failures: FakeFailure[] = [];
  const readFailures: AccountErrorKind[] = [];
  const calls: { method: 'signIn' | 'getMe' | 'setAvailability'; key?: string; request?: CourierAvailabilityRequest }[] = [];

  const nextFailure = () => {
    const failure = failures.shift();
    if (failure && failure !== 'lost-reply') throw new AccountError(failure);
    return failure;
  };

  const api: CourierAccountApi = {
    async signIn(email, password) {
      calls.push({ method: 'signIn' });
      nextFailure();
      if (email !== FAKE_EMAIL || password !== FAKE_PASSWORD) throw new AccountError('invalid-credentials', 400);
      return { accessToken: 'fake-token', expiresAt: Date.now() + 3_600_000 };
    },
    async getMe() {
      calls.push({ method: 'getMe' });
      const readFailure = readFailures.shift();
      if (readFailure) throw new AccountError(readFailure);
      nextFailure();
      if (!enabled) throw new AccountError('not-enabled', 404);
      return me;
    },
    async setAvailability(_session, request, key) {
      calls.push({ method: 'setAvailability', key, request });
      const failure = nextFailure();
      if (!enabled) throw new AccountError('not-enabled', 404);
      const payload = JSON.stringify(request);
      const receipt = receipts.get(key);
      if (receipt) {
        if (receipt.payload !== payload) throw new AccountError('idempotency-conflict', 409);
        return receipt.result;
      }
      if (request.expectedVersion !== me.availability.version) throw new AccountError('version-conflict', 409);
      clock += 60_000;
      me = { ...me, availability: { status: request.status, version: me.availability.version + 1, changedAt: new Date(clock).toISOString() } };
      receipts.set(key, { payload, result: me });
      if (failure === 'lost-reply') throw new AccountError('timeout');
      return me;
    },
  };

  return {
    api,
    calls,
    failNext: (...kinds: FakeFailure[]) => failures.push(...kinds),
    /** Fails only the next profile read (GET /v1/couriers/me). */
    failNextRead: (kind: AccountErrorKind) => readFailures.push(kind),
    /** Another device changes the availability behind the app's back. */
    changeElsewhere(status: CourierMeResponse['availability']['status']) {
      clock += 60_000;
      me = { ...me, availability: { status, version: me.availability.version + 1, changedAt: new Date(clock).toISOString() } };
    },
    revoke: () => { enabled = false; },
    current: () => me,
  };
}
