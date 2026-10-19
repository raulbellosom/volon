import type { Delivery } from '@prisma/client';
import { parseDeliveryResponse, type DeliveryResponse } from '@delivery/contracts';

export type DeliveryProjection = Pick<Delivery, 'id' | 'branchId' | 'quoteId' | 'status' | 'version'
  | 'createdAt' | 'amountMinor' | 'currency' | 'baseAmountMinor' | 'distanceAmountMinor' | 'rateVersion'>;

export function toDeliveryResponse(row: DeliveryProjection): DeliveryResponse {
  return parseDeliveryResponse({ deliveryId: row.id, branchId: row.branchId, quoteId: row.quoteId,
    status: row.status, version: row.version, createdAt: row.createdAt.toISOString(),
    pricing: { amountMinor: row.amountMinor, currency: row.currency, rateVersion: row.rateVersion,
      lines: [
        { code: 'base_delivery', amountMinor: row.baseAmountMinor },
        { code: 'distance_delivery', amountMinor: row.distanceAmountMinor },
      ],
    },
  });
}
