import type { CheckoutSandboxFixture, CheckoutTestState } from '../../modules/payments/checkout-sandbox.port.ts';
import type { StripeTestHttp } from './http.ts';
import { charge, mismatch, payment, session } from './objects.ts';
import type { StripeTestEvent } from './signature.ts';

/** Only authenticated test transport responses may establish external bindings. */
export async function readStripeTestState(http: StripeTestHttp, key: string, fixture: CheckoutSandboxFixture): Promise<CheckoutTestState> {
  const binding = fixture.submission;
  if (!binding?.sessionId) return 'pending';
  const checkout = session(await http.request(key, '/v1/checkout/sessions/' + binding.sessionId), fixture, binding.sessionId);
  if (binding.paymentId && checkout.paymentId !== binding.paymentId) mismatch();
  if (checkout.status === 'expired') return fixture.adverse ?? 'expired';
  if (!checkout.paymentId) return fixture.adverse ?? 'pending';
  const intent = payment(await http.request(key, '/v1/payment_intents/' + checkout.paymentId), fixture, checkout.paymentId);
  if (binding.chargeId && intent.chargeId !== binding.chargeId) mismatch();
  let state: CheckoutTestState = intent.failed ? 'failed' : 'pending';
  if (intent.chargeId) state = charge(await http.request(key, '/v1/charges/' + intent.chargeId), fixture, intent.chargeId, checkout.paymentId);
  // Bind only after all object, scope and money checks have passed.
  binding.paymentId = checkout.paymentId;
  // A PI can have several declined attempts before its eventual successful charge.
  // Freeze the charge binding only once the PI succeeds or adverse evidence exists.
  if (intent.status === 'succeeded' || state === 'refunded' || state === 'disputed') binding.chargeId = intent.chargeId;
  if (state === 'disputed') fixture.adverse = 'disputed';
  else if (state === 'refunded' && fixture.adverse !== 'disputed') fixture.adverse = 'refunded';
  if (fixture.adverse) return fixture.adverse;
  if (intent.failed || state === 'failed') return 'failed';
  if (state === 'captured_test') return checkout.status === 'complete' && checkout.paid && intent.status === 'succeeded'
    && intent.received === fixture.amountMinor ? 'captured_test' : 'capture_pending';
  if (intent.status === 'succeeded' || intent.status === 'requires_capture' || state === 'capture_pending') return 'capture_pending';
  return 'pending';
}

export function bindStripeTestEvent(event: StripeTestEvent, fixture: CheckoutSandboxFixture) {
  const binding = fixture.submission;
  const object = event.object;
  let matches = false;
  if (object.object === 'checkout.session') matches = object.id === binding?.sessionId && object.mode === 'payment'
    && object.currency === 'mxn' && object.amount_total === fixture.amountMinor
    && (object.payment_intent === null || object.payment_intent === binding?.paymentId);
  if (object.object === 'payment_intent') matches = !!binding?.paymentId && object.id === binding.paymentId
    && object.currency === 'mxn' && object.amount === fixture.amountMinor;
  if (object.object === 'charge') matches = !!binding?.chargeId && object.id === binding.chargeId
    && object.payment_intent === binding.paymentId && object.currency === 'mxn' && object.amount === fixture.amountMinor;
  if (object.object === 'dispute') matches = !!binding?.chargeId && object.charge === binding.chargeId
    && object.payment_intent === binding.paymentId && object.currency === 'mxn'
    && Number.isSafeInteger(object.amount) && Number(object.amount) > 0 && Number(object.amount) <= fixture.amountMinor;
  if (!matches || !binding?.sessionId) mismatch();
  if (event.type.startsWith('charge.dispute.')) fixture.adverse = 'disputed';
  if (event.type === 'charge.refunded' && fixture.adverse !== 'disputed') {
    if (!Number.isSafeInteger(object.amount_refunded) || Number(object.amount_refunded) <= 0 || Number(object.amount_refunded) > fixture.amountMinor) mismatch();
    fixture.adverse = 'refunded';
  }
}
