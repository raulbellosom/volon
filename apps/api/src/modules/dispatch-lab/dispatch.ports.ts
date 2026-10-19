import type { CourierActor } from '../couriers/courier.service.ts';
import type { DispatchReceipt } from './dispatch.contract.ts';

/** Synchronous local decision only. A future PSP adapter needs a separate consistency design. */
export interface FinancialEligibilityPort {
  evaluate(syntheticDeliveryRef: string): 'synthetic-fixture' | 'missing' | 'pending' | 'failed' | 'revoked';
}
export const denyFinancialEligibility: FinancialEligibilityPort = Object.freeze({ evaluate: () => 'missing' });
export interface DispatchTransaction {
  courier(): Promise<{ courierId: string; status: string } | null>;
  lockDelivery(reference: string): Promise<void>;
  find(kind: DispatchReceipt['kind'], id: string): Promise<DispatchReceipt | null>;
  previous(courierId: string, keyHash: string): Promise<{ requestHash: string; receipt: unknown } | null>;
  clock(): Promise<Date>;
  offer(courierId: string, reference: string, ttlSeconds: number): Promise<DispatchReceipt>;
  transition(receipt: DispatchReceipt, status: string): Promise<DispatchReceipt>;
  assign(offer: DispatchReceipt): Promise<DispatchReceipt>;
  event(receipt: DispatchReceipt): Promise<void>;
  record(receipt: DispatchReceipt, keyHash: string, requestHash: string): Promise<void>;
}
export interface DispatchStore {
  transaction<T>(actor: CourierActor, work: (tx: DispatchTransaction) => Promise<T>): Promise<T>;
}
