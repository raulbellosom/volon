import { randomUUID } from 'node:crypto';
import { Prisma, type PrismaClient } from '@prisma/client';
import { assertRuntimeRole, withSubject } from './database.ts';
import { DispatchFailure, parseDispatchReceipt, type DispatchReceipt } from '../modules/dispatch-lab/dispatch.contract.ts';
import type { DispatchStore, DispatchTransaction } from '../modules/dispatch-lab/dispatch.ports.ts';

type Row = { id: string; syntheticDeliveryRef: string; courierId: string; status: string;
  version: number; changedAt: Date; expiresAt?: Date };
function receipt(kind: DispatchReceipt['kind'], row: Row): DispatchReceipt {
  return parseDispatchReceipt({ kind, id: row.id, syntheticDeliveryRef: row.syntheticDeliveryRef,
    courierId: row.courierId, status: row.status, version: row.version, changedAt: row.changedAt.toISOString(),
    ...(kind === 'offer' ? { expiresAt: row.expiresAt?.toISOString() } : {}) });
}
function transaction(tx: Prisma.TransactionClient): DispatchTransaction {
  const clock = async () => {
    const [row] = await tx.$queryRaw<{ time: Date }[]>`SELECT clock_timestamp() AS time`;
    if (!row) throw new Error('Clock unavailable');
    return row.time;
  };
  const find = async (kind: DispatchReceipt['kind'], id: string) => {
    const row = kind === 'offer' ? await tx.dispatchLabOffer.findUnique({ where: { id } })
      : await tx.dispatchLabAssignment.findUnique({ where: { id } });
    return row ? receipt(kind, row) : null;
  };
  return {
    courier: async () => {
      const [row] = await tx.$queryRaw<{ courierId: string; status: string }[]>`
        SELECT c.id AS "courierId", s.status FROM app."Courier" c
        JOIN app."CourierShift" s ON s."courierId" = c.id`;
      return row ?? null;
    },
    lockDelivery: async (reference) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended('dispatch-lab:' || ${reference}::uuid::text, 0))::text`;
    },
    find,
    previous: (courierId, idempotencyKeyHash) => tx.dispatchLabCommand.findUnique({ where: {
      courierId_idempotencyKeyHash: { courierId, idempotencyKeyHash },
    }, select: { requestHash: true, receipt: true } }),
    clock,
    offer: async (courierId, syntheticDeliveryRef, ttlSeconds) => {
      const expiresAt = new Date((await clock()).getTime() + ttlSeconds * 1000);
      return receipt('offer', await tx.dispatchLabOffer.create({ data: { id: randomUUID(), courierId, syntheticDeliveryRef, expiresAt } }));
    },
    transition: async (current, status) => {
      const where = { id: current.id, version: current.version };
      const data = { status, version: { increment: 1 } };
      const updated = current.kind === 'offer' ? await tx.dispatchLabOffer.updateMany({ where, data })
        : await tx.dispatchLabAssignment.updateMany({ where, data });
      if (updated.count !== 1) throw new DispatchFailure('VERSION_CONFLICT');
      const result = await find(current.kind, current.id);
      if (!result) throw new DispatchFailure('NOT_FOUND');
      return result;
    },
    assign: async (offer) => receipt('assignment', await tx.dispatchLabAssignment.create({ data: {
      id: randomUUID(), offerId: offer.id, courierId: offer.courierId, syntheticDeliveryRef: offer.syntheticDeliveryRef,
    } })),
    event: async (result) => {
      await tx.dispatchLabOutbox.create({ data: { id: randomUUID(), courierId: result.courierId,
        syntheticDeliveryRef: result.syntheticDeliveryRef, aggregateKind: result.kind,
        aggregateId: result.id, aggregateVersion: result.version, eventType: `${result.kind}.${result.status}.v1`,
        occurredAt: new Date(result.changedAt) } });
    },
    record: async (result, idempotencyKeyHash, requestHash) => {
      await tx.dispatchLabCommand.create({ data: { courierId: result.courierId, idempotencyKeyHash,
        requestHash, receipt: { ...result } } });
    },
  };
}
export function createDispatchLabRepository(db: PrismaClient): DispatchStore {
  return {
    transaction: async (actor, work) => {
      try {
        await assertRuntimeRole(db);
        return await withSubject(db, actor, async (tx) => {
          await tx.$queryRaw`SELECT set_config('app.dispatch_lab', 'synthetic-v1', true)`;
          await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(
            'courier-subject:' || ${actor.subjectId}::uuid::text, 0))::text`;
          return work(transaction(tx));
        });
      } catch (error) {
        if (error instanceof DispatchFailure) throw error;
        // A hidden winner must never leak its identity through a uniqueness error.
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new DispatchFailure('STATE_CONFLICT');
        throw new DispatchFailure('INFRASTRUCTURE_UNAVAILABLE');
      }
    },
  };
}
