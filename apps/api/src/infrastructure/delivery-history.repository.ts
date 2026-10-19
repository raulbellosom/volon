import type { PrismaClient } from '@prisma/client';
import type { DeliveryHistoryStore } from '../modules/deliveries/delivery-history.service.ts';
import { withSubject } from './database.ts';
import { toDeliveryResponse, type DeliveryProjection } from './delivery-response.ts';

type HistoryRow = Omit<DeliveryProjection, 'createdAt'> & { createdAt: string };

export function createDeliveryHistoryRepository(db: PrismaClient): DeliveryHistoryStore {
  return {
    readHistory: (actor, query, boundary) => withSubject(db, actor, async (tx) => {
      // One data statement: branch visibility and Delivery RLS share a snapshot,
      // including when the page is empty or authorization changes concurrently.
      const [result] = await tx.$queryRaw<{ items: HistoryRow[] }[]>`
        SELECT (
          SELECT coalesce(jsonb_agg(to_jsonb(page) ORDER BY page."createdAt" DESC, page.id COLLATE "C" DESC), '[]'::jsonb)
          FROM (
            SELECT d.id, d."branchId", d."quoteId", d.status, d.version, d."createdAt",
              d."amountMinor", d.currency, d."baseAmountMinor", d."distanceAmountMinor", d."rateVersion", r."publicReference"
            FROM app."Delivery" d
            JOIN app."DeliveryPublicReference" r ON r."deliveryId" = d.id
            WHERE d."branchId" = b.id AND d."merchantId" = b."merchantId"
              AND (${boundary?.createdAt ?? null}::timestamptz IS NULL
                OR (d."createdAt", d.id COLLATE "C") <
                  (${boundary?.createdAt ?? null}::timestamptz, ${boundary?.deliveryId ?? null}::text COLLATE "C"))
            ORDER BY d."createdAt" DESC, d.id COLLATE "C" DESC
            LIMIT ${query.limit + 1}
          ) page
        ) AS items
        FROM app."Branch" b WHERE b.id = ${query.branchId}`;
      if (!result) return null;
      return result.items.map((row) => toDeliveryResponse({ ...row, createdAt: new Date(row.createdAt) }));
    }),
  };
}
