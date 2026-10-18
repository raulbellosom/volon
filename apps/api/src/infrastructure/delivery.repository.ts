import { randomUUID } from 'node:crypto';
import type { Delivery, PrismaClient } from '@prisma/client';
import { parseDeliveryQuoteRequest, type DeliveryResponse } from '@delivery/contracts';
import { withSubject } from './database.ts';
import type { DeliveryStore } from '../modules/deliveries/delivery.service.ts';

function toResponse(row: Delivery): DeliveryResponse {
  return { deliveryId: row.id, branchId: row.branchId, quoteId: row.quoteId,
    status: 'requested', version: 1, createdAt: row.createdAt.toISOString(),
    pricing: { amountMinor: row.amountMinor, currency: 'MXN', rateVersion: row.rateVersion,
      lines: [
        { code: 'base_delivery', amountMinor: row.baseAmountMinor },
        { code: 'distance_delivery', amountMinor: row.distanceAmountMinor },
      ],
    },
  };
}

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
        return row ? { requestHash: row.requestHash, response: toResponse(row) } : null;
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
      insert: async (quote, idempotencyKeyHash, requestHash) => toResponse(await tx.delivery.create({ data: {
        id: randomUUID(), subjectId: actor.subjectId, branchId: quote.branchId, merchantId: quote.merchantId,
        quoteId: quote.id, amountMinor: quote.amountMinor, baseAmountMinor: quote.baseAmountMinor,
        distanceAmountMinor: quote.distanceAmountMinor, currency: quote.currency, rateVersion: quote.rateVersion,
        routeSnapshot: { ...quote.route, pickup: { ...quote.route.pickup }, dropoff: { ...quote.route.dropoff } },
        idempotencyKeyHash, requestHash,
      } })),
    })),
    readDelivery: (actor, id) => withSubject(db, actor, async (tx) => {
      const row = await tx.delivery.findUnique({ where: { id } });
      return row ? toResponse(row) : null;
    }),
  };
}
