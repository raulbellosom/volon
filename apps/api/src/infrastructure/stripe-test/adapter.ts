import { createHash } from 'node:crypto';
import type { PaymentActor } from '../../modules/payments/payment.contract.ts';
import { uuid } from '../../modules/payments/payment.contract.ts';
import { CheckoutTestFailure, type CheckoutSandboxFixture, type CheckoutSandboxStore,
  type CheckoutTestObservation, type SandboxCheckoutPort } from '../../modules/payments/checkout-sandbox.port.ts';
import { record, validateStripeTestConfig, validateStripeTestSecrets, STRIPE_TEST_API_VERSION,
  type StripeTestConfig, type StripeTestSecrets } from './config.ts';
import { denyStripeTransport, StripeTestHttp, type StripeTestTransport } from './http.ts';
import { session, mismatch } from './objects.ts';
import { snapshotWebhook, verifyStripeTestEvent } from './signature.ts';
import { bindStripeTestEvent, readStripeTestState } from './reconcile.ts';

const hash = (value: string) => createHash('sha256').update(value).digest('hex');
function intentReference(actor: PaymentActor, value: unknown): string {
  if (!actor || !uuid.test(actor.subjectId)) throw new CheckoutTestFailure('NOT_FOUND');
  if (!record(value) || Object.keys(value).length !== 1 || !Object.hasOwn(value, 'intentId')
    || typeof value.intentId !== 'string' || !uuid.test(value.intentId))
    throw new CheckoutTestFailure('INVALID_COMMAND');
  return value.intentId;
}
function observation(fixture: CheckoutSandboxFixture, state: CheckoutTestObservation['state'], duplicate = false): CheckoutTestObservation {
  return Object.freeze({ scope: 'offline-test', intentId: fixture.intentId, sessionId: fixture.submission?.sessionId ?? null,
    state: fixture.adverse ?? state, eligible: false, duplicate });
}
function parameters(fixture: CheckoutSandboxFixture, config: StripeTestConfig) {
  return new URLSearchParams({ mode: 'payment', 'payment_method_types[0]': 'card', client_reference_id: fixture.intentId,
    'metadata[intentId]': fixture.intentId, 'payment_intent_data[metadata][intentId]': fixture.intentId,
    'payment_intent_data[capture_method]': 'automatic', 'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': 'mxn', 'line_items[0][price_data][unit_amount]': String(fixture.amountMinor),
    'line_items[0][price_data][product_data][name]': 'Servicio logístico de prueba',
    success_url: config.returnOrigin + '/stripe-test/success', cancel_url: config.returnOrigin + '/stripe-test/cancel' });
}
interface StripeTestOptions {
  readonly config: StripeTestConfig;
  readonly secrets: () => Promise<StripeTestSecrets>;
  readonly store: CheckoutSandboxStore;
  readonly transport?: StripeTestTransport;
  readonly clock?: () => number;
  readonly timeoutMs?: number;
}
/** No network implementation, DB adapter, public route or operational evidence conversion. */
export class StripeCheckoutTestAdapter implements SandboxCheckoutPort {
  private readonly options: StripeTestOptions;
  private readonly config: StripeTestConfig;
  private readonly http: StripeTestHttp;
  private readonly clock: () => number;
  constructor(options: StripeTestOptions) {
    this.options = options;
    this.config = validateStripeTestConfig(options.config);
    this.http = new StripeTestHttp(options.transport ?? denyStripeTransport, options.timeoutMs);
    this.clock = options.clock ?? Date.now;
  }
  private async run(actor: PaymentActor, input: unknown, work: (fixture: CheckoutSandboxFixture, secrets: StripeTestSecrets) => Promise<CheckoutTestObservation>) {
    const id = intentReference(actor, input);
    try {
      const result = await this.options.store.run(actor, id, async (fixture) => {
        // Commit an uncertain reservation even when a submitted request later fails validation.
        try {
          if (fixture.purpose !== 'isolated-payment-fixture' || fixture.intentId !== id || fixture.currency !== 'MXN'
            || !Number.isSafeInteger(fixture.amountMinor) || fixture.amountMinor < 1000 || fixture.amountMinor > 99999999)
            throw new CheckoutTestFailure('INVALID_COMMAND');
          if (fixture.submission && fixture.submission.key !== this.key(id)) mismatch();
          const secrets = validateStripeTestSecrets(await this.options.secrets());
          return { ok: true as const, value: await work(fixture, secrets) };
        } catch (error) {
          return { ok: false as const, code: error instanceof CheckoutTestFailure ? error.code : 'INFRASTRUCTURE_UNAVAILABLE' as const };
        }
      });
      if (!result.ok) throw new CheckoutTestFailure(result.code);
      return result.value;
    } catch (error) {
      if (error instanceof CheckoutTestFailure) throw error;
      throw new CheckoutTestFailure('INFRASTRUCTURE_UNAVAILABLE');
    }
  }
  private key(intentId: string) { return 'stripe-test-session-' + hash(this.config.accountId + ':' + intentId); }
  async create(actor: PaymentActor, input: unknown) {
    return this.run(actor, input, async (fixture, secrets) => {
      const form = parameters(fixture, this.config);
      const digest = hash(STRIPE_TEST_API_VERSION + ':' + this.config.accountId + ':' + form.toString());
      if (fixture.submission && fixture.submission.hash !== digest) throw new CheckoutTestFailure('IDEMPOTENCY_CONFLICT');
      const now = this.clock();
      if (!Number.isFinite(now) || (fixture.submission && now < fixture.submission.startedAt)) throw new CheckoutTestFailure('CONFIGURATION_INVALID');
      if (fixture.submission && !fixture.submission.sessionId && now - fixture.submission.startedAt >= 23 * 3600000)
        throw new CheckoutTestFailure('RETRY_WINDOW_EXPIRED');
      fixture.submission ??= { key: this.key(fixture.intentId), hash: digest, startedAt: now,
        sessionId: null, paymentId: null, chargeId: null };
      try {
        await this.http.account(secrets.apiKey, this.config.accountId);
        if (fixture.submission.sessionId) return observation(fixture, 'pending');
        const checkout = session(await this.http.request(secrets.apiKey, '/v1/checkout/sessions', form, fixture.submission.key), fixture);
        fixture.submission.sessionId = checkout.id;
        fixture.submission.paymentId = checkout.paymentId;
        return observation(fixture, 'pending');
      } catch (error) {
        if (error instanceof CheckoutTestFailure && error.code === 'REQUEST_UNKNOWN') return observation(fixture, 'unknown');
        throw error;
      }
    });
  }
  async reconcile(actor: PaymentActor, input: unknown) {
    return this.run(actor, input, async (fixture, secrets) => {
      try {
        await this.http.account(secrets.apiKey, this.config.accountId);
        return observation(fixture, await readStripeTestState(this.http, secrets.apiKey, fixture));
      } catch (error) {
        if (error instanceof CheckoutTestFailure && error.code === 'REQUEST_UNKNOWN') return observation(fixture, 'unknown');
        throw error;
      }
    });
  }
  async observe(actor: PaymentActor, input: unknown, body: Uint8Array, signature: string) {
    const original = snapshotWebhook(body);
    return this.run(actor, input, async (fixture, secrets) => {
      const event = verifyStripeTestEvent(original, signature, secrets.webhookSecret, this.clock());
      const previous = fixture.events.get(event.id);
      if (previous) {
        if (previous.digest !== event.digest) throw new CheckoutTestFailure('REPLAY_CONFLICT');
        return observation(fixture, previous.receipt.state, true);
      }
      if (!fixture.submission?.sessionId) throw new CheckoutTestFailure('EVENT_REJECTED');
      const binding = fixture.submission;
      const needsBinding = (event.object.object === 'checkout.session' && event.object.payment_intent !== null && !binding.paymentId)
        || (event.object.object === 'payment_intent' && !binding.paymentId)
        || (['charge', 'dispute'].includes(String(event.object.object)) && !binding.chargeId);
      // A signed adverse event for an already bound charge stays blocking on timeout.
      if (!needsBinding) bindStripeTestEvent(event, fixture);
      try {
        await this.http.account(secrets.apiKey, this.config.accountId);
        const state = await readStripeTestState(this.http, secrets.apiKey, fixture);
        if (needsBinding) bindStripeTestEvent(event, fixture);
        const receipt = observation(fixture, state);
        fixture.events.set(event.id, { digest: event.digest, receipt });
        return receipt;
      } catch (error) {
        if (error instanceof CheckoutTestFailure && error.code === 'REQUEST_UNKNOWN') return observation(fixture, 'unknown');
        throw error;
      }
    });
  }
}
