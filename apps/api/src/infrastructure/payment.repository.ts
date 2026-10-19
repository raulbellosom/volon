import { randomUUID } from 'node:crypto';
import type { PrismaClient, Prisma } from '@prisma/client';
import { assertRuntimeRole, withSubject } from './database.ts';
import { PaymentFailure, type PaymentActor, type PreparedPayment } from '../modules/payments/payment.contract.ts';
import type { PaymentStore } from '../modules/payments/payment.service.ts';

async function visibleDelivery(tx: Prisma.TransactionClient, deliveryId: string) {
  const delivery = await tx.delivery.findUnique({ where: { id: deliveryId },
    select: { id: true, amountMinor: true, currency: true } });
  if (!delivery) throw new PaymentFailure('NOT_FOUND');
  return delivery;
}
async function readIntent(tx: Prisma.TransactionClient, deliveryId: string): Promise<PreparedPayment | null> {
  const row = await tx.servicePaymentIntent.findUnique({ where: { deliveryId }, include: { attempt: true } });
  if (!row) return null;
  if (!row.attempt || row.status !== 'pending' || row.version !== 1 || row.currency !== 'MXN'
    || row.attempt.status !== 'not_submitted' || row.attempt.provider !== null || row.attempt.providerPaymentId !== null)
    throw new PaymentFailure('INFRASTRUCTURE_UNAVAILABLE');
  return { intentId: row.id, deliveryId: row.deliveryId, amountMinor: row.amountMinor,
    currency: 'MXN', status: 'pending', version: 1, createdAt: row.createdAt.toISOString(),
    attempt: { attemptId: row.attempt.id, status: 'not_submitted' } };
}
export function createPaymentStore(db: PrismaClient): PaymentStore {
  return {
    async authorize(actor: PaymentActor, deliveryId: string) {
      await assertRuntimeRole(db);
      await withSubject(db, actor, async (tx) => { await visibleDelivery(tx, deliveryId); });
    },
    async prepare(actor, deliveryId, keyHash, requestHash) {
      await assertRuntimeRole(db);
      return withSubject(db, actor, async (tx) => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'payment-command:' + actor.subjectId + ':' + keyHash}, 0))::text`;
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'payment-delivery:' + deliveryId}, 0))::text`;
        // Reauthorize after waiting, including idempotent replays.
        const delivery = await visibleDelivery(tx, deliveryId);
        const previous = await tx.servicePaymentCommand.findUnique({
          where: { subjectId_idempotencyKeyHash: { subjectId: actor.subjectId, idempotencyKeyHash: keyHash } },
        });
        if (previous && previous.requestHash !== requestHash) throw new PaymentFailure('IDEMPOTENCY_CONFLICT');
        let result = await readIntent(tx, deliveryId);
        if (!result) {
          const intentId = randomUUID();
          // Explicit columns: Prisma create would send client-side status/version defaults,
          // which the least-privilege database role intentionally cannot write.
          await tx.$executeRaw`INSERT INTO app."ServicePaymentIntent" (id, "deliveryId", "amountMinor", currency)
            VALUES (${intentId}::uuid, ${deliveryId}, ${delivery.amountMinor}, ${delivery.currency})`;
          await tx.$executeRaw`INSERT INTO app."ServicePaymentAttempt" (id, "intentId") VALUES (${randomUUID()}::uuid, ${intentId}::uuid)`;
          result = await readIntent(tx, deliveryId);
        }
        if (!result) throw new PaymentFailure('INFRASTRUCTURE_UNAVAILABLE');
        if (!previous) await tx.servicePaymentCommand.create({ data: {
          subjectId: actor.subjectId, idempotencyKeyHash: keyHash, requestHash, intentId: result.intentId,
        } });
        return result;
      });
    },
  };
}
