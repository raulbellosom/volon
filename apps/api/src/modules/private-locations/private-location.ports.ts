import type { QuoteActor } from '../pricing/quote.service.ts';

export type EnvelopeState = 'active' | 'revoked' | 'key_destroyed';
export interface EnvelopeContext {
  readonly id: string;
  readonly subjectId: string;
  readonly merchantId: string;
  readonly branchId: string;
  readonly requestId: string;
  readonly version: number;
  readonly policyId: string;
  readonly expiresAt: Date;
  readonly keyRef: string;
}
export interface SealedPayload {
  readonly iv: Uint8Array;
  readonly tag: Uint8Array;
  readonly ciphertext: Uint8Array;
}
export interface EnvelopeRow extends EnvelopeContext, SealedPayload {
  readonly state: string;
}
export interface LocationKeyPort {
  readonly kind: string;
  readonly create: (keyRef: string) => Promise<void>;
  readonly seal: (keyRef: string, plaintext: Buffer, aad: Buffer) => Promise<SealedPayload>;
  readonly open: (keyRef: string, payload: SealedPayload, aad: Buffer) => Promise<Buffer>;
  readonly destroy: (keyRef: string) => Promise<void>;
}
export interface LocationLedgerPort {
  readonly kind: string;
  readonly inspect: (id: string) => Promise<{ binding: string; state: EnvelopeState } | null>;
  readonly activate: (id: string, binding: string) => Promise<void>;
  readonly revoke: (id: string, binding: string) => Promise<void>;
  readonly confirmDestroyed: (id: string, binding: string) => Promise<void>;
}
export interface LocationTransaction {
  readonly branch: (id: string) => Promise<{ id: string; merchantId: string } | null>;
  readonly load: (id: string) => Promise<EnvelopeRow | null>;
  readonly findRequest: (branchId: string, requestId: string) => Promise<EnvelopeRow | null>;
  readonly insert: (row: EnvelopeRow) => Promise<void>;
  readonly transition: (id: string, state: 'revoked' | 'key_destroyed') => Promise<void>;
  readonly now: () => Promise<Date>;
}
export interface LocationStore {
  readonly transaction: <T>(actor: QuoteActor, lock: string,
    operation: (tx: LocationTransaction) => Promise<T>) => Promise<T>;
}
export interface LocationLabGate {
  readonly environment: 'local' | 'test';
  readonly enabled: boolean;
  readonly syntheticOnly: boolean;
}
