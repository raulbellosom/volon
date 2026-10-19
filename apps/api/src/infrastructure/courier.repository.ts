import type { Prisma, PrismaClient } from '@prisma/client';
import { parseCourierMeResponse, type CourierMeResponse } from '@delivery/contracts';
import { assertRuntimeRole, withSubject } from './database.ts';
import type { CourierActor, CourierStore } from '../modules/couriers/courier.service.ts';

function response(courierId: string, row: { status: string; version: number; changedAt: Date }): CourierMeResponse {
  return parseCourierMeResponse({ courierId, availability: { status: row.status,
    version: row.version, changedAt: row.changedAt.toISOString() } });
}
async function read(tx: Prisma.TransactionClient, actor: CourierActor): Promise<CourierMeResponse | null> {
  const [row] = await tx.$queryRaw<{ courierId: string; status: string; version: number; changedAt: Date }[]>`
    SELECT c.id AS "courierId", s.status, s.version, s."changedAt"
    FROM app."Courier" c JOIN app."CourierShift" s ON s."courierId" = c.id
    WHERE c."subjectId" = ${actor.subjectId}::uuid`;
  return row ? response(row.courierId, row) : null;
}
export function createCourierRepository(db: PrismaClient): CourierStore {
  return {
    read: async (actor) => {
      await assertRuntimeRole(db);
      return withSubject(db, actor, (tx) => read(tx, actor));
    },
    transaction: async (actor, work) => {
      await assertRuntimeRole(db);
      return withSubject(db, actor, async (tx) => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(
          'courier-subject:' || ${actor.subjectId}::uuid::text, 0))::text`;
        return work({
          read: () => read(tx, actor),
          findCommand: async (courierId, idempotencyKeyHash) => {
            const row = await tx.courierAvailabilityCommand.findUnique({ where: {
              courierId_idempotencyKeyHash: { courierId, idempotencyKeyHash },
            } });
            return row ? { requestHash: row.requestHash, response: response(courierId, row) } : null;
          },
          update: async (courierId, request) => {
            const result = await tx.courierShift.updateMany({ where: { courierId, version: request.expectedVersion },
              data: { status: request.status, version: { increment: 1 } } });
            return result.count === 1 ? read(tx, actor) : null;
          },
          record: async (dto, idempotencyKeyHash, requestHash) => {
            await tx.courierAvailabilityCommand.create({ data: { courierId: dto.courierId,
              idempotencyKeyHash, requestHash, status: dto.availability.status,
              version: dto.availability.version, changedAt: new Date(dto.availability.changedAt) } });
          },
        });
      });
    },
  };
}
