import { randomUUID } from 'node:crypto';
import type { PrismaClient, Prisma, StripeSandboxSubmission } from '@prisma/client';
import type { PaymentActor } from '../../modules/payments/payment.contract.ts';
import { uuid } from '../../modules/payments/payment.contract.ts';
import { CheckoutTestFailure, type CheckoutSandboxStore, type CheckoutSandboxReservation } from '../../modules/payments/checkout-sandbox.port.ts';
import { assertRuntimeRole, withSubject } from '../database.ts';
import { snapshot, sandboxError, testState, uniqueViolation } from './persistence.ts';

/** Short DB-only transactions. Deliberately has no transport dependency or async work callback. */
export function createPostgresCheckoutSandboxStore(db: PrismaClient, leaseMs = 30000): CheckoutSandboxStore {
  if (process.env.NODE_ENV === 'production' || !Number.isInteger(leaseMs) || leaseMs < 100 || leaseMs > 60000)
    throw new CheckoutTestFailure('CONFIGURATION_INVALID');
  async function transaction<T>(actor: PaymentActor, work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    try {
      if (!actor || !uuid.test(actor.subjectId)) throw new CheckoutTestFailure('NOT_FOUND');
      await assertRuntimeRole(db);
      return await withSubject(db, actor, async (tx) => {
        await tx.$queryRaw`SELECT set_config('app.stripe_sandbox', 'offline-test-v1', true)`;
        await tx.$executeRaw`SET LOCAL lock_timeout = '1000ms'`;
        await tx.$executeRaw`SET LOCAL statement_timeout = '2000ms'`;
        return work(tx);
      });
    } catch (error) { sandboxError(error); }
  }
  async function scenario(tx: Prisma.TransactionClient, id: string, accountId?: string) {
    const row = await tx.stripeSandboxScenario.findUnique({ where: { id } });
    if (!row || (accountId !== undefined && row.accountId !== accountId)) throw new CheckoutTestFailure('NOT_FOUND');
    return row;
  }
  return {
    reserve: (actor, id, accountId) => transaction(actor, async (tx) => {
      if (!uuid.test(id)) throw new CheckoutTestFailure('INVALID_COMMAND');
      const visible = await scenario(tx, id, accountId);
      await tx.$executeRaw`INSERT INTO app."StripeSandboxSubmission" ("scenarioId","accountId")
        VALUES (${id}::uuid, ${accountId}) ON CONFLICT ("scenarioId") DO NOTHING`;
      await tx.$queryRaw`SELECT "scenarioId" FROM app."StripeSandboxSubmission" WHERE "scenarioId" = ${id}::uuid FOR UPDATE`;
      // Clock evaluation occurs after acquiring the lock, not at transaction start.
      const [timing] = await tx.$queryRaw<{ busy: boolean }[]>`SELECT "leaseUntil" > clock_timestamp() AS busy
        FROM app."StripeSandboxSubmission" WHERE "scenarioId" = ${id}::uuid`;
      if (!timing) throw new CheckoutTestFailure('NOT_FOUND');
      if (timing.busy) throw new CheckoutTestFailure('REQUEST_BUSY');
      const token = randomUUID();
      const [row] = await tx.$queryRaw<StripeSandboxSubmission[]>`UPDATE app."StripeSandboxSubmission"
        SET "leaseToken" = ${token}::uuid, "leaseUntil" = clock_timestamp() + ${leaseMs} * interval '1 millisecond',
          state = CASE WHEN key IS NOT NULL AND "sessionId" IS NULL THEN 'unknown' ELSE state END
        WHERE "scenarioId" = ${id}::uuid RETURNING *`;
      if (!row) throw new CheckoutTestFailure('NOT_FOUND');
      return { token, version: row.version, fixture: await snapshot(tx, visible, row) };
    }),
    async save(actor, reservation: CheckoutSandboxReservation, release) {
      const updated = await transaction(actor, async (tx) => {
        const f = reservation.fixture;
        const visible = await scenario(tx, f.intentId);
        if (!release) {
          const [window] = await tx.$queryRaw<{ expired: boolean }[]>`SELECT "sessionId" IS NULL
            AND "startedAt" <= clock_timestamp() - interval '23 hours' AS expired
            FROM app."StripeSandboxSubmission" WHERE "scenarioId" = ${f.intentId}::uuid`;
          if (window?.expired) throw new CheckoutTestFailure('RETRY_WINDOW_EXPIRED');
        }
        // No caller can change the immutable server fixture by editing the detached snapshot.
        if (f.amountMinor !== visible.amountMinor || f.currency !== visible.currency || f.purpose !== 'isolated-payment-fixture')
          throw new CheckoutTestFailure('INVALID_COMMAND');
        const submission = f.submission;
        const state = testState(f.adverse ?? f.state);
        const [row] = await tx.$queryRaw<StripeSandboxSubmission[]>`UPDATE app."StripeSandboxSubmission" SET
          key = ${submission?.key ?? null}, hash = ${submission?.hash ?? null},
          "sessionId" = ${submission?.sessionId ?? null}, "paymentId" = ${submission?.paymentId ?? null},
          "chargeId" = ${submission?.chargeId ?? null}, adverse = ${f.adverse}, state = ${state},
          "leaseToken" = CASE WHEN ${release} THEN NULL ELSE "leaseToken" END,
          "leaseUntil" = CASE WHEN ${release} THEN NULL ELSE "leaseUntil" END
          WHERE "scenarioId" = ${f.intentId}::uuid AND version = ${reservation.version}
            AND "leaseToken" = ${reservation.token}::uuid AND "leaseUntil" > clock_timestamp() RETURNING *`;
        if (!row) throw new CheckoutTestFailure('VERSION_CONFLICT');
        const persisted = await tx.stripeSandboxEvent.findMany({ where: { scenarioId: f.intentId }, take: 1001 });
        const events = new Map(persisted.map((e) => [e.eventId, e]));
        if (persisted.length > 1000 || f.events.size > 1000) throw new CheckoutTestFailure('INFRASTRUCTURE_UNAVAILABLE');
        for (const [eventId, event] of f.events) {
          const previous = events.get(eventId);
          if (previous) {
            if (previous.scenarioId !== f.intentId || previous.digest !== event.digest)
              throw new CheckoutTestFailure('REPLAY_CONFLICT');
            continue;
          }
          // Serialize global event claims; uniqueness still protects actors unable to see the competing row.
          try {
            await tx.stripeSandboxEvent.create({ data: { accountId: row.accountId, eventId, scenarioId: f.intentId,
              digest: event.digest, state: testState(event.receipt.state), version: row.version } });
          } catch (error) {
            if (uniqueViolation(error)) throw new CheckoutTestFailure('REPLAY_CONFLICT');
            throw error;
          }
        }
        return row;
      });
      reservation.version = updated.version;
      if (reservation.fixture.submission && updated.startedAt)
        reservation.fixture.submission.startedAt = updated.startedAt.getTime();
    },
  };
}
