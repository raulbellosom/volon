import { createHash } from 'node:crypto';

export const stripeTestHash = (value: string) => createHash('sha256').update(value).digest('hex');
export const stripeSessionKey = (accountId: string, id: string) => 'stripe-test-session-' + stripeTestHash(accountId + ':' + id);
export function stripeSessionParameters(intentId: string, amountMinor: number, returnOrigin: string) {
  return new URLSearchParams({ mode: 'payment', client_reference_id: intentId,
    'metadata[intentId]': intentId, 'payment_intent_data[metadata][intentId]': intentId,
    'payment_intent_data[capture_method]': 'automatic', 'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': 'mxn', 'line_items[0][price_data][unit_amount]': String(amountMinor),
    'line_items[0][price_data][product_data][name]': 'Servicio logístico de prueba',
    success_url: returnOrigin + '/stripe-test/success', cancel_url: returnOrigin + '/stripe-test/cancel' });
}
