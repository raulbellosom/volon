import type { PrismaClient, PricingQuote } from '@prisma/client';
import type { DeliveryQuoteResponse } from '@delivery/contracts';
import { withSubject } from './database.ts';
import { serializeRouteSnapshot } from '../modules/pricing/route-snapshot.ts';
import { QuoteFailure, type QuoteActor, type StoredQuote } from '../modules/pricing/quote.service.ts';

function toResponse(quote: PricingQuote): DeliveryQuoteResponse {
  return {
    quoteId: quote.id, expiresAt: quote.expiresAt.toISOString(), currency: 'MXN',
    amountMinor: quote.amountMinor, coverage: 'eligible',
    lines: [
      { code: 'base_delivery', amountMinor: quote.baseAmountMinor },
      { code: 'distance_delivery', amountMinor: quote.distanceAmountMinor },
    ],
  };
}

export function createQuoteRepository(db: PrismaClient) {
  return {
    canQuote: (actor: QuoteActor, branchId: string) => withSubject(db, actor, async (tx) =>
      (await tx.branch.count({ where: { id: branchId } })) === 1),

    saveQuote: (quote: StoredQuote) => withSubject(db, { subjectId: quote.subjectId }, async (tx) => {
      const branch = await tx.branch.findUnique({ where: { id: quote.branchId } });
      if (!branch) throw new QuoteFailure('ACCESS_DENIED');
      if (quote.request.pickupOrigin === 'branch_record'
        && (branch.latitude !== quote.request.pickup.lat || branch.longitude !== quote.request.pickup.lng)) {
        throw new QuoteFailure('OUTSIDE_COVERAGE');
      }
      const base = quote.response.lines.find((line) => line.code === 'base_delivery');
      const distance = quote.response.lines.find((line) => line.code === 'distance_delivery');
      if (!base || !distance) throw new Error('Invalid quote breakdown');
      await tx.pricingQuote.create({ data: {
        id: quote.response.quoteId, subjectId: quote.subjectId,
        merchantId: branch.merchantId, branchId: branch.id,
        request: serializeRouteSnapshot(quote.request),
        amountMinor: quote.response.amountMinor, baseAmountMinor: base.amountMinor,
        distanceAmountMinor: distance.amountMinor, currency: quote.response.currency,
        expiresAt: new Date(quote.response.expiresAt), rateVersion: quote.rateVersion,
      } });
    }),

    readQuote: (actor: QuoteActor, id: string) => withSubject(db, actor, async (tx) => {
      const quote = await tx.pricingQuote.findUnique({ where: { id } });
      return quote ? toResponse(quote) : null;
    }),
  };
}
