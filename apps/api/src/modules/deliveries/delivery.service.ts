import { createHash } from 'node:crypto';
import type { CreateDeliveryRequest, DeliveryResponse } from '@delivery/contracts';
import type { RouteSnapshot } from '../pricing/route-snapshot.ts';
import type { QuoteActor } from '../pricing/quote.service.ts';

export class DeliveryFailure extends Error {
  readonly code: 'ACCESS_DENIED' | 'QUOTE_NOT_FOUND' | 'QUOTE_EXPIRED' | 'QUOTE_ALREADY_USED' | 'IDEMPOTENCY_CONFLICT';
  constructor(code: DeliveryFailure['code']) {
    super(code);
    this.code = code;
  }
}

export interface DeliveryQuoteSnapshot {
  readonly id: string;
  readonly branchId: string;
  readonly merchantId: string;
  readonly expiresAt: Date;
  readonly amountMinor: number;
  readonly baseAmountMinor: number;
  readonly distanceAmountMinor: number;
  readonly currency: 'MXN';
  readonly rateVersion: string;
  readonly route: RouteSnapshot;
}

export interface DeliveryTransaction {
  readonly lockKey: (branchId: string, keyHash: string) => Promise<void>;
  readonly hasBranch: (branchId: string) => Promise<boolean>;
  readonly findCommand: (branchId: string, keyHash: string) => Promise<{
    readonly requestHash: string; readonly response: DeliveryResponse;
  } | null>;
  readonly loadLockedQuote: (quoteId: string, branchId: string) => Promise<DeliveryQuoteSnapshot | null>;
  readonly quoteInUse: (quoteId: string) => Promise<boolean>;
  readonly currentTime: () => Promise<Date>;
  readonly insert: (quote: DeliveryQuoteSnapshot, keyHash: string, requestHash: string) => Promise<DeliveryResponse>;
}

export interface DeliveryStore {
  readonly readByReference?: (actor: QuoteActor, reference: string) => Promise<DeliveryResponse | null>;
  readonly transaction: <T>(actor: QuoteActor, operation: (tx: DeliveryTransaction) => Promise<T>) => Promise<T>;
  readonly readDelivery: (actor: QuoteActor, deliveryId: string) => Promise<DeliveryResponse | null>;
}

export const commandDigest = (value: string): string => createHash('sha256').update(value).digest('hex');

export function createDeliveryService(store: DeliveryStore) {
  return (actor: QuoteActor, request: CreateDeliveryRequest, key: string) => {
    const keyHash = commandDigest(key);
    const requestHash = commandDigest(JSON.stringify({ branchId: request.branchId, quoteId: request.quoteId }));
    return store.transaction(actor, async (tx) => {
      await tx.lockKey(request.branchId, keyHash);
      if (!await tx.hasBranch(request.branchId)) throw new DeliveryFailure('ACCESS_DENIED');
      const existing = await tx.findCommand(request.branchId, keyHash);
      if (existing) {
        if (existing.requestHash !== requestHash) throw new DeliveryFailure('IDEMPOTENCY_CONFLICT');
        return existing.response;
      }
      const quote = await tx.loadLockedQuote(request.quoteId, request.branchId);
      if (!quote) throw new DeliveryFailure('QUOTE_NOT_FOUND');
      if (quote.expiresAt.getTime() <= (await tx.currentTime()).getTime()) throw new DeliveryFailure('QUOTE_EXPIRED');
      if (await tx.quoteInUse(quote.id)) throw new DeliveryFailure('QUOTE_ALREADY_USED');
      // INSERT + RLS revalidate scope, expiry and snapshot; transaction must commit before HTTP success.
      return tx.insert(quote, keyHash, requestHash);
    });
  };
}
