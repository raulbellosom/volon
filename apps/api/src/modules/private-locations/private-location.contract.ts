import { createHash } from 'node:crypto';
import type { EnvelopeContext, LocationLabGate } from './private-location.ports.ts';

export class PrivateLocationFailure extends Error {
  readonly code: 'UNAUTHENTICATED' | 'INVALID_INPUT' | 'ACCESS_DENIED' | 'CONFLICT' | 'UNAVAILABLE';
  constructor(code: PrivateLocationFailure['code']) { super(code); this.code = code; }
}
export function assertLab(gate: LocationLabGate): void {
  if (!gate.enabled || !gate.syntheticOnly || !['test', 'local'].includes(gate.environment)
    || process.env.NODE_ENV === 'production') throw new PrivateLocationFailure('UNAVAILABLE');
}
export function uuid(value: unknown): asserts value is string {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new PrivateLocationFailure('INVALID_INPUT');
  }
}
export type FixtureId = 'grid-a' | 'grid-b';
export function syntheticPayload(fixtureId: FixtureId) {
  if (fixtureId !== 'grid-a' && fixtureId !== 'grid-b') throw new PrivateLocationFailure('INVALID_INPUT');
  return Object.freeze({ fixtureId, source: 'synthetic' as const, verification: 'unverified' as const,
    addressLine: fixtureId === 'grid-a' ? 'CALLE SINTÉTICA A, SIN DOMICILIO REAL' : 'CALLE SINTÉTICA B, SIN DOMICILIO REAL',
    coordinates: Object.freeze({ lat: fixtureId === 'grid-a' ? 0.01 : 0.02, lng: 0.01 }) });
}
export function decodeSynthetic(buffer: Buffer): ReturnType<typeof syntheticPayload> {
  try {
    const value: unknown = JSON.parse(buffer.toString('utf8'));
    if (typeof value !== 'object' || value === null || !('fixtureId' in value)) throw new Error();
    const expected = syntheticPayload(value.fixtureId as FixtureId);
    if (JSON.stringify(value) !== JSON.stringify(expected)) throw new Error();
    return expected;
  } catch { throw new PrivateLocationFailure('UNAVAILABLE'); }
}
export function envelopeAad(row: EnvelopeContext): Buffer {
  return Buffer.from(JSON.stringify(['synthetic-private-location-v1', row.merchantId, row.branchId,
    row.id, row.version, row.subjectId, row.requestId, row.policyId, row.expiresAt.toISOString(), row.keyRef]));
}
export const envelopeBinding = (row: EnvelopeContext) => createHash('sha256').update(envelopeAad(row)).digest('hex');
export async function keyDeadline<T>(operation: () => Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([operation(), new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => reject(new PrivateLocationFailure('UNAVAILABLE')), 1000);
    })]);
  } finally { if (timer !== undefined) clearTimeout(timer); }
}
