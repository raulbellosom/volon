import { randomUUID } from 'node:crypto';
import type { Delivery, PrismaClient } from '@prisma/client';
import { parseRouteSnapshot, serializeRouteSnapshot } from '../modules/pricing/route-snapshot.ts';
import { withSubject } from './database.ts';
import type { DeliveryStore } from '../modules/deliveries/delivery.service.ts';
import { toDeliveryResponse } from './delivery-response.ts';
import { allocatePublicReference, generatePublicReference } from '../modules/deliveries/public-reference.ts';

function project(row: Delivery & { publicReference: { publicReference: string } | null }) {
  if (!row.publicReference) throw new Error('Missing delivery reference');
  return toDeliveryResponse({ ...row, publicReference: row.publicReference.publicReference });
}

export function createDeliveryRepository(db: PrismaClient, options: {
  prefix?: string; newReference?: (time: Date) => string;
} = {}): DeliveryStore {
  return {
    transaction: (actor, operation) => withSubject(db, actor, (tx) => operation({
      lockKey: async (branchId, keyHash) => {
        const scope = `delivery-command:${actor.subjectId}:${branchId}:${keyHash}`;
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${scope}, 0))::text`;
      },
      hasBranch: async (branchId) => (await tx.branch.count({ where: { id: branchId } })) === 1,
      findCommand: async (branchId, idempotencyKeyHash) => {
        const row = await tx.delivery.findUnique({ where: {
          subjectId_branchId_idempotencyKeyHash: { subjectId: actor.subjectId, branchId, idempotencyKeyHash },
        }, include: { publicReference: true } });
        return row ? { requestHash: row.requestHash, response: project(row) } : null;
      },
      loadLockedQuote: async (id, branchId) => {
        // One lock per quote across actors/keys. No UPDATE privilege on PricingQuote is required.
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'delivery-quote:' + id}, 0))::text`;
        const row = await tx.pricingQuote.findFirst({ where: { id, branchId } });
        if (!row) return null;
        if (row.currency !== 'MXN') throw new Error('Invalid stored currency');
        return { ...row, currency: row.currency, route: parseRouteSnapshot(row.request) };
      },
      currentTime: async () => {
        const [clock] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
        if (!clock) throw new Error('Database clock unavailable');
        return clock.now;
      },
      quoteInUse: async (quoteId) => (await tx.delivery.count({ where: { quoteId } })) > 0,
      insert: async (quote, idempotencyKeyHash, requestHash) => {
        const row = await tx.delivery.create({ data: {
          id: randomUUID(), subjectId: actor.subjectId, branchId: quote.branchId, merchantId: quote.merchantId,
          quoteId: quote.id, amountMinor: quote.amountMinor, baseAmountMinor: quote.baseAmountMinor,
          distanceAmountMinor: quote.distanceAmountMinor, currency: quote.currency, rateVersion: quote.rateVersion,
          routeSnapshot: serializeRouteSnapshot(quote.route),
          idempotencyKeyHash, requestHash,
        } });
        const [clock] = await tx.$queryRaw<{ time: Date }[]>`SELECT clock_timestamp() AS time`;
        if (!clock) throw new Error('Database clock unavailable');
        const publicReference = await allocatePublicReference(clock.time, async (reference) => {
          const inserted = await tx.$queryRaw<{ publicReference: string }[]>`
            INSERT INTO app."DeliveryPublicReference"("deliveryId", "publicReference") VALUES (${row.id}, ${reference})
            ON CONFLICT ("publicReference") DO NOTHING RETURNING "publicReference"`;
          return inserted.length === 1;
        }, options.newReference ?? ((time) => generatePublicReference(time, options.prefix)));
        return toDeliveryResponse({ ...row, publicReference });
      },
    })),
    readDelivery: (actor, id) => withSubject(db, actor, async (tx) => {
      const row = await tx.delivery.findUnique({ where: { id }, include: { publicReference: true } });
      return row ? project(row) : null;
    }),
    readByReference: (actor, publicReference) => withSubject(db, actor, async (tx) => {
      const row = await tx.deliveryPublicReference.findUnique({ where: { publicReference }, include: { delivery: true } });
      return row ? toDeliveryResponse({ ...row.delivery, publicReference: row.publicReference }) : null;
    }),
  };
}
