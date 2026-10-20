import { CheckoutTestFailure } from '../../modules/payments/checkout-sandbox.port.ts';
import { record, STRIPE_TEST_API_VERSION } from './config.ts';
export interface StripeTestRequest {
  readonly url: string;
  readonly method: 'GET' | 'POST';
  readonly headers: Readonly<Record<string, string>>;
  readonly body: string | undefined;
  readonly signal: AbortSignal;
  readonly redirect: 'error';
}
export type StripeTestTransport = (request: StripeTestRequest) => Promise<{ readonly status: number; readonly body: Uint8Array }>;
export const denyStripeTransport: StripeTestTransport = async () => { throw new CheckoutTestFailure('TRANSPORT_DISABLED'); };
export class StripeTestHttp {
  private readonly transport: StripeTestTransport;
  private readonly timeoutMs: number;
  constructor(transport: StripeTestTransport, timeoutMs = 5000) {
    if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 5000) throw new CheckoutTestFailure('CONFIGURATION_INVALID');
    this.transport = transport;
    this.timeoutMs = timeoutMs;
  }
  async request(key: string, path: string, form?: URLSearchParams, idempotencyKey?: string): Promise<Record<string, unknown>> {
    if (!/^\/v1\/(?:account|checkout\/sessions(?:\/cs_test_[A-Za-z0-9_]+)?|payment_intents\/pi_[A-Za-z0-9_]+|charges\/ch_[A-Za-z0-9_]+)$/.test(path))
      throw new CheckoutTestFailure('INVALID_COMMAND');
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => { controller.abort(); reject(new CheckoutTestFailure('REQUEST_UNKNOWN')); }, this.timeoutMs);
    });
    try {
      const response = await Promise.race([timeout, this.transport({ url: 'https://api.stripe.com' + path,
        method: form ? 'POST' : 'GET', headers: { Authorization: 'Bearer ' + key, 'Stripe-Version': STRIPE_TEST_API_VERSION,
          ...(form ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
          ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) }, body: form?.toString(), signal: controller.signal, redirect: 'error' })]);
      if (!Number.isInteger(response.status) || response.status < 100 || response.status > 599) throw new CheckoutTestFailure('RESPONSE_MISMATCH');
      if (response.status >= 500 || response.status === 429 || response.status === 409) throw new CheckoutTestFailure('REQUEST_UNKNOWN');
      if (response.status !== 200) throw new CheckoutTestFailure('PROVIDER_REJECTED');
      if (!(response.body instanceof Uint8Array) || response.body.byteLength > 262144) throw new CheckoutTestFailure('RESPONSE_MISMATCH');
      let value: unknown;
      try { value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(response.body)); }
      catch { throw new CheckoutTestFailure('RESPONSE_MISMATCH'); }
      if (!record(value)) throw new CheckoutTestFailure('RESPONSE_MISMATCH');
      return value;
    } catch (error) {
      if (error instanceof CheckoutTestFailure) throw error;
      throw new CheckoutTestFailure('REQUEST_UNKNOWN');
    } finally { clearTimeout(timer); }
  }
  async account(key: string, accountId: string) {
    const account = await this.request(key, '/v1/account');
    if (account.object !== 'account' || account.id !== accountId) throw new CheckoutTestFailure('RESPONSE_MISMATCH');
  }
}
