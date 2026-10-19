import type { PrismaClient } from '@prisma/client';
import { assertRuntimeRole, withSubject } from './database.ts';
import type { LocationStore } from '../modules/private-locations/private-location.ports.ts';

/** Isolated lab repository. Never composed by main.ts or a public HTTP handler. */
export function createPrivateLocationRepository(db: PrismaClient): LocationStore {
  return { transaction: async (actor, lock, operation) => {
    await assertRuntimeRole(db);
    return withSubject(db, actor, async (tx) => {
      await tx.$queryRaw`SELECT set_config('app.private_location_lab', 'synthetic-v1', true)`;
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'private-location:' + lock}, 0))::text`;
      return operation({
        branch: (id) => tx.branch.findUnique({ where: { id }, select: { id: true, merchantId: true } }),
        load: (id) => tx.privateLocationEnvelope.findUnique({ where: { id } }),
        findRequest: (branchId, requestId) => tx.privateLocationEnvelope.findUnique({ where: {
          subjectId_branchId_requestId: { subjectId: actor.subjectId, branchId, requestId },
        } }),
        insert: async (row) => { await tx.privateLocationEnvelope.create({ data: {
          ...row, iv: Buffer.from(row.iv), tag: Buffer.from(row.tag), ciphertext: Buffer.from(row.ciphertext),
        } }); },
        transition: async (id, state) => {
          if (state === 'revoked') await tx.$executeRaw`
            UPDATE app."PrivateLocationEnvelope" SET state = 'revoked', "revokedAt" = clock_timestamp()
            WHERE id = ${id}::uuid AND state = 'active'`;
          else await tx.$executeRaw`
            UPDATE app."PrivateLocationEnvelope" SET state = 'key_destroyed', "keyDestroyedAt" = clock_timestamp()
            WHERE id = ${id}::uuid AND state = 'revoked'`;
        },
        now: async () => {
          const [row] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
          if (!row) throw new Error('Clock unavailable');
          return row.now;
        },
      });
    });
  } };
}
