import { CheckoutTestFailure, type CheckoutSandboxFixture, type CheckoutTestState } from '../../modules/payments/checkout-sandbox.port.ts';
import { record, stripeId } from './config.ts';
export function mismatch(): never { throw new CheckoutTestFailure('RESPONSE_MISMATCH'); }
export function money(value: unknown): value is number { return Number.isSafeInteger(value) && Number(value) >= 0; }
function base(row: Record<string, unknown>, type: string, id: string, fixture: CheckoutSandboxFixture) {
  if (row.object !== type || row.id !== id || row.livemode !== false || row.currency !== 'mxn'
    || row.amount !== fixture.amountMinor || row.on_behalf_of != null || row.transfer_data != null) mismatch();
}
export function session(row: Record<string, unknown>, fixture: CheckoutSandboxFixture, expectedId?: string) {
  if (!stripeId(row.id, 'cs_test_') || (expectedId !== undefined && row.id !== expectedId)
    || row.object !== 'checkout.session' || row.livemode !== false || row.mode !== 'payment'
    || row.currency !== 'mxn' || row.amount_total !== fixture.amountMinor
    || (row.amount_subtotal !== undefined && row.amount_subtotal !== fixture.amountMinor)
    || row.client_reference_id !== fixture.intentId
    || typeof row.status !== 'string' || !['open', 'complete', 'expired'].includes(row.status)
    || (row.payment_status !== 'paid' && row.payment_status !== 'unpaid')
    || (row.payment_intent !== null && !stripeId(row.payment_intent, 'pi_'))) mismatch();
  if (row.url !== null) {
    if (typeof row.url !== 'string' || row.url.length > 4096) mismatch();
    let url: URL;
    try { url = new URL(row.url); } catch { return mismatch(); }
    if (url.origin !== 'https://checkout.stripe.com' || url.username || url.password
      || url.pathname !== '/c/pay/' + row.id) mismatch();
  } else if (row.status === 'open') mismatch();
  return { id: row.id, status: row.status, paid: row.payment_status === 'paid', paymentId: row.payment_intent as string | null };
}
export function payment(row: Record<string, unknown>, fixture: CheckoutSandboxFixture, id: string) {
  base(row, 'payment_intent', id, fixture);
  if (!money(row.amount_received) || row.amount_received > fixture.amountMinor || !money(row.amount_capturable)
    || typeof row.status !== 'string' || !['requires_payment_method', 'requires_confirmation', 'requires_action', 'processing',
      'requires_capture', 'canceled', 'succeeded'].includes(row.status)
    || typeof row.capture_method !== 'string' || !['automatic', 'automatic_async'].includes(row.capture_method)
    || (row.latest_charge !== null && !stripeId(row.latest_charge, 'ch_'))
    || (row.last_payment_error !== null && !record(row.last_payment_error))) mismatch();
  return { status: row.status, received: row.amount_received, chargeId: row.latest_charge as string | null,
    failed: row.status === 'canceled' || row.last_payment_error !== null };
}
export function charge(row: Record<string, unknown>, fixture: CheckoutSandboxFixture, id: string, paymentId: string): CheckoutTestState {
  base(row, 'charge', id, fixture);
  if (row.payment_intent !== paymentId || !money(row.amount_captured) || row.amount_captured > fixture.amountMinor
    || !money(row.amount_refunded) || row.amount_refunded > fixture.amountMinor
    || typeof row.paid !== 'boolean' || typeof row.captured !== 'boolean' || typeof row.disputed !== 'boolean'
    || typeof row.refunded !== 'boolean' || typeof row.status !== 'string' || !['succeeded', 'pending', 'failed'].includes(row.status)) mismatch();
  if (row.disputed) return 'disputed';
  if (row.refunded || row.amount_refunded > 0) return 'refunded';
  if (row.status === 'failed') return 'failed';
  return row.status === 'succeeded' && row.paid && row.captured && row.amount_captured === fixture.amountMinor ? 'captured_test' : 'capture_pending';
}
