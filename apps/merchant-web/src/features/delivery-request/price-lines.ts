import type { PriceLine } from '@delivery/ui-web';
import type { DeliveryQuoteResponse } from '../../api/merchant-api.ts';

const LINE_LABELS: Record<DeliveryQuoteResponse['lines'][number]['code'], string> = {
  base_delivery: 'Tarifa base de entrega',
  distance_delivery: 'Cargo por distancia',
};

/** Server price lines as display rows; amounts pass through untouched. */
export function priceLines(lines: DeliveryQuoteResponse['lines']): PriceLine[] {
  return lines.map((line) => ({ id: line.code, label: LINE_LABELS[line.code], amountMinor: line.amountMinor }));
}
