import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { CheckoutTestFailure } from '../../modules/payments/checkout-sandbox.port.ts';
import { record, stripeId, STRIPE_TEST_API_VERSION } from './config.ts';

export interface StripeTestEvent { readonly id: string; readonly type: string; readonly object: Record<string, unknown>; readonly digest: string }
const types: Readonly<Record<string, string>> = Object.freeze({
  'checkout.session.completed': 'checkout.session', 'checkout.session.async_payment_succeeded': 'checkout.session',
  'checkout.session.async_payment_failed': 'checkout.session', 'checkout.session.expired': 'checkout.session',
  'payment_intent.succeeded': 'payment_intent', 'payment_intent.payment_failed': 'payment_intent', 'payment_intent.canceled': 'payment_intent',
  'charge.refunded': 'charge', 'charge.dispute.created': 'dispute', 'charge.dispute.updated': 'dispute', 'charge.dispute.closed': 'dispute',
});
export function snapshotWebhook(body: Uint8Array): Buffer {
  if (!(body instanceof Uint8Array) || !body.length || body.length > 65536) throw new CheckoutTestFailure('INVALID_SIGNATURE');
  return Buffer.from(body);
}
export function verifyStripeTestEvent(body: Buffer, header: string, secret: string, now: number): StripeTestEvent {
  const invalid = (): never => { throw new CheckoutTestFailure('INVALID_SIGNATURE'); };
  if (typeof header !== 'string' || header.length > 4096 || !Number.isFinite(now)) invalid();
  const fields = header.split(',').map((entry) => entry.trim().split('='));
  if (fields.some((field) => field.length !== 2)) invalid();
  const timestamps = fields.filter(([key]) => key === 't');
  const signatures = fields.filter(([key]) => key === 'v1').map((entry) => entry[1]);
  const timestamp = timestamps[0]?.[1];
  if (timestamps.length !== 1 || !timestamp || !/^\d{1,12}$/.test(timestamp) || signatures.length < 1 || signatures.length > 8
    || Math.abs(now / 1000 - Number(timestamp)) > 300) invalid();
  const expected = createHmac('sha256', secret).update(timestamp + '.').update(body).digest();
  if (!signatures.some((signature) => typeof signature === 'string' && /^[0-9a-f]{64}$/.test(signature)
    && timingSafeEqual(expected, Buffer.from(signature, 'hex')))) invalid();
  let event: unknown;
  try { event = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(body)); } catch { return invalid(); }
  if (!record(event) || event.object !== 'event' || !stripeId(event.id, 'evt_') || event.livemode !== false
    || event.api_version !== STRIPE_TEST_API_VERSION || event.account !== undefined || event.context !== undefined
    || !Number.isSafeInteger(event.created) || Number(event.created) < 0 || Number(event.created) > now / 1000 + 300
    || typeof event.type !== 'string' || !Object.hasOwn(types, event.type)
    || !record(event.data) || !record(event.data.object) || event.data.object.object !== types[event.type]
    || event.data.object.livemode !== false) throw new CheckoutTestFailure('EVENT_REJECTED');
  return { id: event.id, type: event.type, object: event.data.object,
    digest: createHash('sha256').update(body).digest('hex') };
}
