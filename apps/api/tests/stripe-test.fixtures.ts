import { randomUUID, createHmac } from 'node:crypto';
import type { PaymentActor } from '../src/modules/payments/payment.contract.ts';
import { CheckoutTestFailure, type CheckoutSandboxFixture, type CheckoutSandboxStore, type CheckoutSandboxReservation } from '../src/modules/payments/checkout-sandbox.port.ts';
import { StripeCheckoutTestAdapter } from '../src/infrastructure/stripe-test/adapter.ts';
import { STRIPE_TEST_API_VERSION } from '../src/infrastructure/stripe-test/config.ts';
import type { StripeTestRequest, StripeTestTransport } from '../src/infrastructure/stripe-test/http.ts';

// Explicitly synthetic protocol fixtures, not Stripe credentials or captured customer data.
export const fixtureSecrets = { apiKey: 'sk_test_offline_fixture', webhookSecret: 'whsec_offline_fixture' };
export class MemoryCheckoutFixtures implements CheckoutSandboxStore {
  readonly rows = new Map<string, { subjects: Set<string>; enabled: boolean; fixture: CheckoutSandboxFixture }>();
  private readonly leases = new Map<string, string>();
  add(actor: PaymentActor, amountMinor = 4400): CheckoutSandboxFixture {
    const fixture: CheckoutSandboxFixture = { purpose: 'isolated-payment-fixture', intentId: randomUUID(), amountMinor,
      currency: 'MXN', submission: null, adverse: null, state: 'pending', events: new Map() };
    this.rows.set(fixture.intentId, { subjects: new Set([actor.subjectId]), enabled: true, fixture });
    return fixture;
  }
  get(id: string) {
    const row = this.rows.get(id);
    if (!row) throw new Error('Missing fixture');
    return row;
  }
  async reserve(actor: PaymentActor, id: string): Promise<CheckoutSandboxReservation> {
    const row = this.get(id);
    if (!row.enabled || !row.subjects.has(actor.subjectId)) throw new CheckoutTestFailure('NOT_FOUND');
    if (this.leases.has(id)) throw new CheckoutTestFailure('REQUEST_BUSY');
    const token = randomUUID();
    this.leases.set(id, token);
    return { token, version: 1, fixture: structuredClone(row.fixture) };
  }
  async save(actor: PaymentActor, lease: CheckoutSandboxReservation, release: boolean) {
    const copy = lease.fixture;
    const id = copy.intentId;
    const row = this.get(id);
    if (!row.enabled || !row.subjects.has(actor.subjectId)) throw new CheckoutTestFailure('NOT_FOUND');
    if (this.leases.get(id) !== lease.token) throw new CheckoutTestFailure('VERSION_CONFLICT');
    for (const [otherId, other] of this.rows) {
      if (otherId === id) continue;
      for (const key of ['sessionId', 'paymentId', 'chargeId'] as const)
        if (copy.submission?.[key] && copy.submission[key] === other.fixture.submission?.[key])
          throw new CheckoutTestFailure('IDEMPOTENCY_CONFLICT');
      for (const eventId of copy.events.keys())
        if (other.fixture.events.has(eventId)) throw new CheckoutTestFailure('REPLAY_CONFLICT');
    }
    row.fixture = structuredClone(copy);
    lease.version++;
    if (release) this.leases.delete(id);
  }
}
/** Schema-based subsets of official Session/PaymentIntent/Charge objects, never real PSP responses. */
export class OfflineStripe {
  readonly requests: StripeTestRequest[] = [];
  readonly sessions = new Map<string, { body: string; id: string }>();
  readonly account: Record<string, unknown> = { id: 'acct_offline', object: 'account' };
  readonly checkout: Record<string, unknown>;
  readonly intent: Record<string, unknown>;
  readonly charge: Record<string, unknown>;
  private readonly sessionId: string;
  private readonly paymentId: string;
  private readonly chargeId: string;
  intercept: ((request: StripeTestRequest) => Promise<{ status: number; body: Uint8Array }> | null) | undefined;
  constructor(fixture: CheckoutSandboxFixture, suffix = 'offline') {
    this.sessionId = 'cs_test_' + suffix;
    this.paymentId = 'pi_' + suffix;
    this.chargeId = 'ch_' + suffix;
    this.checkout = { object: 'checkout.session', id: this.sessionId, livemode: false, mode: 'payment',
      currency: 'mxn', amount_total: fixture.amountMinor, amount_subtotal: fixture.amountMinor,
      client_reference_id: fixture.intentId, metadata: { intentId: fixture.intentId }, status: 'open', payment_status: 'unpaid',
      payment_intent: null, url: 'https://checkout.stripe.com/c/pay/' + this.sessionId + '#synthetic' };
    this.intent = { object: 'payment_intent', id: this.paymentId, livemode: false, currency: 'mxn', amount: fixture.amountMinor,
      amount_received: 0, amount_capturable: 0, status: 'requires_payment_method', capture_method: 'automatic',
      latest_charge: null, last_payment_error: null, metadata: { intentId: fixture.intentId }, client_secret: 'synthetic-not-returned' };
    this.charge = { object: 'charge', id: this.chargeId, livemode: false, currency: 'mxn', amount: fixture.amountMinor,
      amount_captured: 0, amount_refunded: 0, paid: false, captured: false, disputed: false, refunded: false,
      payment_intent: this.paymentId, status: 'pending', billing_details: { name: 'Comprador sintético' } };
  }
  paid() {
    Object.assign(this.checkout, { status: 'complete', payment_status: 'paid', payment_intent: this.paymentId, url: null });
    Object.assign(this.intent, { status: 'succeeded', amount_received: this.intent.amount, latest_charge: this.chargeId, last_payment_error: null });
    Object.assign(this.charge, { status: 'succeeded', paid: true, captured: true, amount_captured: this.charge.amount });
  }
  readonly transport: StripeTestTransport = async (request) => {
    this.requests.push(request);
    if (request.method === 'POST') {
      const key = request.headers['Idempotency-Key'];
      if (!key || !request.body) throw new Error('Missing synthetic idempotency');
      const previous = this.sessions.get(key);
      if (previous && previous.body !== request.body) throw new Error('Synthetic idempotency conflict');
      if (!previous) this.sessions.set(key, { body: request.body, id: this.sessionId });
    }
    const intercepted = this.intercept?.(request);
    if (intercepted) return intercepted;
    const path = new URL(request.url).pathname;
    const object = path === '/v1/account' ? this.account : path === '/v1/checkout/sessions' || path === '/v1/checkout/sessions/' + this.sessionId
      ? this.checkout : path === '/v1/payment_intents/' + this.paymentId ? this.intent : path === '/v1/charges/' + this.chargeId ? this.charge : null;
    if (!object) throw new Error('Unexpected test URL');
    return { status: 200, body: Buffer.from(JSON.stringify(object)) };
  };
}
export function sandbox() {
  const actor = { subjectId: randomUUID() };
  const store = new MemoryCheckoutFixtures();
  const fixture = store.add(actor);
  const remote = new OfflineStripe(fixture);
  const time = { now: Date.parse('2026-10-19T12:00:00.000Z') };
  const options = { config: { environment: 'offline-test' as const, accountId: 'acct_offline', returnOrigin: 'http://127.0.0.1:5173' },
    secrets: async () => fixtureSecrets, store, transport: remote.transport, clock: () => time.now };
  return { actor, store, fixture, remote, time, options, adapter: new StripeCheckoutTestAdapter(options), input: { intentId: fixture.intentId } };
}
export function eventBytes(type: string, object: Record<string, unknown>, now: number, patch: Record<string, unknown> = {}): Buffer {
  return Buffer.from(JSON.stringify({ id: 'evt_' + randomUUID().replaceAll('-', ''), object: 'event', type,
    livemode: false, api_version: STRIPE_TEST_API_VERSION, created: Math.floor(now / 1000), data: { object: structuredClone(object) }, ...patch }));
}
export function signStripeFixture(body: Uint8Array, now: number, secret = fixtureSecrets.webhookSecret) {
  const timestamp = String(Math.floor(now / 1000));
  const signature = createHmac('sha256', secret).update(timestamp + '.').update(body).digest('hex');
  return `t=${timestamp},v1=${signature}`;
}
