import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import { parseDeliveryQuoteRequest } from '@delivery/contracts';
import { withSubject } from './database.ts';
import type { DeliveryStore } from '../modules/deliveries/delivery.service.ts';
import { toDeliveryResponse } from './delivery-response.ts';

export function createDeliveryRepository(db: PrismaClient): DeliveryStore {
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
        } });
        return row ? { requestHash: row.requestHash, response: toDeliveryResponse(row) } : null;
      },
      loadLockedQuote: async (id, branchId) => {
        // One lock per quote across actors/keys. No UPDATE privilege on PricingQuote is required.
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'delivery-quote:' + id}, 0))::text`;
        const row = await tx.pricingQuote.findFirst({ where: { id, branchId } });
        if (!row) return null;
        if (row.currency !== 'MXN') throw new Error('Invalid stored currency');
        return { ...row, currency: row.currency, route: parseDeliveryQuoteRequest(row.request) };
      },
      currentTime: async () => {
        const [clock] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
        if (!clock) throw new Error('Database clock unavailable');
        return clock.now;
      },
      quoteInUse: async (quoteId) => (await tx.delivery.count({ where: { quoteId } })) > 0,
      insert: async (quote, idempotencyKeyHash, requestHash) => toDeliveryResponse(await tx.delivery.create({ data: {
        id: randomUUID(), subjectId: actor.subjectId, branchId: quote.branchId, merchantId: quote.merchantId,
        quoteId: quote.id, amountMinor: quote.amountMinor, baseAmountMinor: quote.baseAmountMinor,
        distanceAmountMinor: quote.distanceAmountMinor, currency: quote.currency, rateVersion: quote.rateVersion,
        routeSnapshot: { ...quote.route, pickup: { ...quote.route.pickup }, dropoff: { ...quote.route.dropoff } },
        idempotencyKeyHash, requestHash,
      } })),
    })),
    readDelivery: (actor, id) => withSubject(db, actor, async (tx) => {
      const row = await tx.delivery.findUnique({ where: { id } });
      return row ? toDeliveryResponse(row) : null;
    }),
  };
}
