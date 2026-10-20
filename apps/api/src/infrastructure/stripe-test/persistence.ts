import type { Prisma, StripeSandboxScenario, StripeSandboxSubmission } from '@prisma/client';
import { CheckoutTestFailure, type CheckoutSandboxFixture, type CheckoutTestState } from '../../modules/payments/checkout-sandbox.port.ts';
import { record } from './config.ts';

export const states: readonly string[] = ['pending','unknown','failed','capture_pending','captured_test','expired','refunded','disputed'];
export function testState(value: string): CheckoutTestState {
  if (!states.includes(value)) throw new CheckoutTestFailure('INFRASTRUCTURE_UNAVAILABLE');
  return value as CheckoutTestState;
}
export function sandboxError(error: unknown): never {
  if (error instanceof CheckoutTestFailure) throw error;
  // Unique violations are deliberately indistinguishable from private conflicting bindings.
  if (uniqueViolation(error)) throw new CheckoutTestFailure('IDEMPOTENCY_CONFLICT');
  throw new CheckoutTestFailure('INFRASTRUCTURE_UNAVAILABLE');
}
export function uniqueViolation(error: unknown): boolean {
  if (!record(error)) return false;
  if (error.code === 'P2002') return true;
  const meta = error.meta;
  if (!record(meta)) return false;
  if (meta.code === '23505') return true;
  const adapter = meta.driverAdapterError;
  return record(adapter) && record(adapter.cause) && adapter.cause.originalCode === '23505';
}
export async function snapshot(tx: Prisma.TransactionClient, scenario: StripeSandboxScenario,
  row: StripeSandboxSubmission): Promise<CheckoutSandboxFixture> {
  const events = await tx.stripeSandboxEvent.findMany({ where: { scenarioId: scenario.id }, take: 1001 });
  if (events.length > 1000) throw new CheckoutTestFailure('INFRASTRUCTURE_UNAVAILABLE');
  if (row.adverse !== null && row.adverse !== 'refunded' && row.adverse !== 'disputed')
    throw new CheckoutTestFailure('INFRASTRUCTURE_UNAVAILABLE');
  if (scenario.currency !== 'MXN' || scenario.purpose !== 'offline-test') throw new CheckoutTestFailure('NOT_FOUND');
  return { purpose: 'isolated-payment-fixture', intentId: scenario.id, amountMinor: scenario.amountMinor,
    currency: 'MXN', state: testState(row.state), adverse: row.adverse,
    submission: row.key && row.hash && row.startedAt ? { key: row.key, hash: row.hash, startedAt: row.startedAt.getTime(),
      sessionId: row.sessionId, paymentId: row.paymentId, chargeId: row.chargeId } : null,
    events: new Map(events.map((e) => [e.eventId, { digest: e.digest,
      receipt: Object.freeze({ scope: 'offline-test', intentId: scenario.id, sessionId: row.sessionId,
        state: testState(e.state), eligible: false, duplicate: false }) }])) };
}
