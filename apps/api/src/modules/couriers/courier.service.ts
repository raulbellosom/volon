import { createHash } from 'node:crypto';
import type { CourierAvailabilityRequest, CourierMeResponse } from '@delivery/contracts';

/** Verified Auth identity, independent of merchant memberships. */
export interface CourierActor { readonly subjectId: string }
export class CourierFailure extends Error {
  readonly code: 'NOT_FOUND' | 'VERSION_CONFLICT' | 'IDEMPOTENCY_CONFLICT';
  constructor(code: CourierFailure['code']) { super(code); this.code = code; }
}
export interface CourierTransaction {
  readonly read: () => Promise<CourierMeResponse | null>;
  readonly findCommand: (courierId: string, keyHash: string) => Promise<{
    readonly requestHash: string; readonly response: CourierMeResponse;
  } | null>;
  readonly update: (courierId: string, request: CourierAvailabilityRequest) => Promise<CourierMeResponse | null>;
  readonly record: (response: CourierMeResponse, keyHash: string, requestHash: string) => Promise<void>;
}
export interface CourierStore {
  readonly read: (actor: CourierActor) => Promise<CourierMeResponse | null>;
  /** Serialize by subject, including administrative disable, before checking effective access. */
  readonly transaction: <T>(actor: CourierActor, work: (tx: CourierTransaction) => Promise<T>) => Promise<T>;
}
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export function createCourierAvailabilityService(store: CourierStore) {
  return (actor: CourierActor, request: CourierAvailabilityRequest, key: string) => store.transaction(actor, async (tx) => {
    const current = await tx.read();
    if (!current) throw new CourierFailure('NOT_FOUND');
    const keyHash = digest(key);
    const requestHash = digest(JSON.stringify({ status: request.status, expectedVersion: request.expectedVersion }));
    const previous = await tx.findCommand(current.courierId, keyHash);
    if (previous) {
      if (previous.requestHash !== requestHash) throw new CourierFailure('IDEMPOTENCY_CONFLICT');
      return previous.response;
    }
    if (current.availability.version !== request.expectedVersion) throw new CourierFailure('VERSION_CONFLICT');
    const updated = await tx.update(current.courierId, request);
    if (!updated) throw new CourierFailure('VERSION_CONFLICT');
    await tx.record(updated, keyHash, requestHash);
    return updated;
  });
}
