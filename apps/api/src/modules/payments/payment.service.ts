import { createHash } from 'node:crypto';
import { parsePaymentRequest, validatePaymentActor, validatePaymentKey, infrastructureFailure,
  type FinancialIneligibility, type PaymentActor, type PreparedPayment } from './payment.contract.ts';

export interface PaymentStore {
  prepare(actor: PaymentActor, deliveryId: string, keyHash: string, requestHash: string): Promise<PreparedPayment>;
  authorize(actor: PaymentActor, deliveryId: string): Promise<void>;
}
export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export function createPaymentService(store: PaymentStore) {
  return {
    async prepare(actor: PaymentActor, value: unknown, key: string): Promise<PreparedPayment> {
      validatePaymentActor(actor);
      const request = parsePaymentRequest(value);
      validatePaymentKey(key);
      try { return await store.prepare(actor, request.deliveryId, digest(key), digest(JSON.stringify(request))); }
      catch (error) { return infrastructureFailure(error); }
    },
    async eligibility(actor: PaymentActor, value: unknown): Promise<FinancialIneligibility> {
      validatePaymentActor(actor);
      const request = parsePaymentRequest(value);
      try { await store.authorize(actor, request.deliveryId); }
      catch (error) { return infrastructureFailure(error); }
      // Deliberately no positive port, environment switch or laboratory dependency.
      return { deliveryId: request.deliveryId, eligible: false, reason: 'PSP_NOT_CONFIGURED' };
    },
  };
}
