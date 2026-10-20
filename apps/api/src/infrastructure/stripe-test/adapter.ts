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
import { stripeTestHash as hash, stripeSessionKey, stripeSessionParameters } from './checkout-parameters.ts';

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
interface StripeTestOptions {
  readonly config: StripeTestConfig;
  readonly secrets: () => Promise<StripeTestSecrets>;
  readonly store: CheckoutSandboxStore;
  readonly transport?: StripeTestTransport;
  readonly clock?: () => number;
  readonly timeoutMs?: number;
}
/** No network implementation, public route or operational evidence conversion. */
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
  private async run(actor: PaymentActor, input: unknown, work: (fixture: CheckoutSandboxFixture, secrets: StripeTestSecrets,
    checkpoint: () => Promise<void>) => Promise<CheckoutTestObservation>) {
    const id = intentReference(actor, input);
    try {
      const reservation = await this.options.store.reserve(actor, id, this.config.accountId);
      const fixture = reservation.fixture;
      let result: CheckoutTestObservation | undefined;
      let failure: CheckoutTestFailure['code'] | undefined;
      try {
        if (fixture.purpose !== 'isolated-payment-fixture' || fixture.intentId !== id || fixture.currency !== 'MXN'
          || !Number.isSafeInteger(fixture.amountMinor) || fixture.amountMinor < 1000 || fixture.amountMinor > 99999999)
          throw new CheckoutTestFailure('INVALID_COMMAND');
        if (fixture.submission && fixture.submission.key !== this.key(id)) mismatch();
        const secrets = validateStripeTestSecrets(await this.options.secrets());
        result = await work(fixture, secrets, () => this.options.store.save(actor, reservation, false));
        fixture.state = result.state;
      } catch (error) {
        failure = error instanceof CheckoutTestFailure ? error.code : 'INFRASTRUCTURE_UNAVAILABLE';
        fixture.state = fixture.adverse ?? 'unknown';
      }
      // Provider work above has completed; storage reauthorizes and fences expired workers.
      await this.options.store.save(actor, reservation, true);
      if (failure) throw new CheckoutTestFailure(failure);
      if (!result) throw new CheckoutTestFailure('INFRASTRUCTURE_UNAVAILABLE');
      return result;
    } catch (error) {
      if (error instanceof CheckoutTestFailure) throw error;
      throw new CheckoutTestFailure('INFRASTRUCTURE_UNAVAILABLE');
    }
  }
  private key(intentId: string) { return stripeSessionKey(this.config.accountId, intentId); }
  async create(actor: PaymentActor, input: unknown) {
    return this.run(actor, input, async (fixture, secrets, checkpoint) => {
      const form = stripeSessionParameters(fixture.intentId, fixture.amountMinor, this.config.returnOrigin);
      const digest = hash(STRIPE_TEST_API_VERSION + ':' + this.config.accountId + ':' + form.toString());
      if (fixture.submission && fixture.submission.hash !== digest) throw new CheckoutTestFailure('IDEMPOTENCY_CONFLICT');
      const now = this.clock();
      if (!Number.isFinite(now) || (fixture.submission && now < fixture.submission.startedAt)) throw new CheckoutTestFailure('CONFIGURATION_INVALID');
      if (fixture.submission && !fixture.submission.sessionId && now - fixture.submission.startedAt >= 23 * 3600000)
        throw new CheckoutTestFailure('RETRY_WINDOW_EXPIRED');
      fixture.submission ??= { key: this.key(fixture.intentId), hash: digest, startedAt: now,
        sessionId: null, paymentId: null, chargeId: null };
      // Durable reservation MUST precede every possible POST. No SQL remains open after this await.
      await checkpoint();
      try {
        await this.http.account(secrets.apiKey, this.config.accountId);
        if (fixture.submission.sessionId) return observation(fixture, fixture.state);
        await checkpoint(); // Reauthorize immediately before submission, including expiry/retry-window checks.
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
    return (await this.observeRecorded(actor, input, body, signature)).receipt;
  }
  /** Private ingress must not acknowledge a webhook until its event receipt is committed. */
  async observeRecorded(actor: PaymentActor, input: unknown, body: Uint8Array, signature: string) {
    const original = snapshotWebhook(body);
    let recorded = false;
    const receipt = await this.run(actor, input, async (fixture, secrets, checkpoint) => {
      if (!secrets.webhookSecret) throw new CheckoutTestFailure('CONFIGURATION_INVALID');
      const event = verifyStripeTestEvent(original, signature, secrets.webhookSecret, this.clock());
      const previous = fixture.events.get(event.id);
      if (previous) {
        if (previous.digest !== event.digest) throw new CheckoutTestFailure('REPLAY_CONFLICT');
        recorded = true;
        return observation(fixture, previous.receipt.state, true);
      }
      if (!fixture.submission?.sessionId) throw new CheckoutTestFailure('EVENT_REJECTED');
      const binding = fixture.submission;
      const needsBinding = (event.object.object === 'checkout.session' && event.object.payment_intent !== null && !binding.paymentId)
        || (event.object.object === 'payment_intent' && !binding.paymentId)
        || (['charge', 'dispute'].includes(String(event.object.object)) && !binding.chargeId);
      // A signed adverse event for an already bound charge stays blocking on timeout.
      if (!needsBinding) {
        bindStripeTestEvent(event, fixture);
        if (fixture.adverse) await checkpoint();
      }
      try {
        await this.http.account(secrets.apiKey, this.config.accountId);
        const state = await readStripeTestState(this.http, secrets.apiKey, fixture);
        if (needsBinding) bindStripeTestEvent(event, fixture);
        const receipt = observation(fixture, state);
        fixture.events.set(event.id, { digest: event.digest, receipt });
        recorded = true;
        return receipt;
      } catch (error) {
        if (error instanceof CheckoutTestFailure && error.code === 'REQUEST_UNKNOWN') return observation(fixture, 'unknown');
        throw error;
      }
    });
    return { receipt, recorded };
  }
}
