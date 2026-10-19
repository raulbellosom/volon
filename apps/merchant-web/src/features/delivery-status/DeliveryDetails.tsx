import { DescriptionList, PriceBreakdown, Timeline, type TimelineEvent } from '@delivery/ui-web';
import { CalendarClock, Hash, Store } from 'lucide-react';
import type { DeliveryResponse } from '../../api/merchant-api.ts';
import { formatDateTime, formatTime } from '../../shared/format-date.ts';
import { pricingSource } from '../../shared/pricing-notice.ts';
import { priceLines } from '../delivery-request/price-lines.ts';
import { DeliveryLocations } from './DeliveryLocations.tsx';
import { PublicReference } from '../../shared/PublicReference.tsx';

const LATER = 'Aparecerá cuando la asignación de repartidores esté disponible.';

/** The API only reports `requested` today; later steps are shown as what comes next, never as facts. */
function timeline(delivery: DeliveryResponse): TimelineEvent[] {
  return [
    {
      id: 'requested',
      title: 'Solicitado',
      state: 'current',
      time: formatTime(delivery.createdAt),
      dateTime: delivery.createdAt,
      description: 'Recibimos tu solicitud.',
    },
    { id: 'assigned', title: 'Repartidor asignado', state: 'upcoming', description: LATER },
    { id: 'picked-up', title: 'Recogido en sucursal', state: 'upcoming' },
    { id: 'delivered', title: 'Entregado', state: 'upcoming' },
  ];
}

export function DeliveryDetails({ delivery, branchName }: { delivery: DeliveryResponse; branchName: string }) {
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="flex flex-col gap-10">
        <section aria-labelledby="progress-title" className="flex flex-col gap-4">
          <h2 id="progress-title" className="text-lg font-bold">Avance</h2>
          <Timeline events={timeline(delivery)} aria-label="Avance del envío" />
        </section>
        <DeliveryLocations deliveryId={delivery.deliveryId} branchName={branchName} />
      </div>
      <div className="flex flex-col gap-8">
        <section aria-labelledby="facts-title" className="flex flex-col gap-4">
          <h2 id="facts-title" className="text-lg font-bold">Datos del envío</h2>
          <DescriptionList
            layout="stacked"
            items={[
              { term: 'Folio', icon: <Hash />, description: <PublicReference value={delivery.publicReference} /> },
              { term: 'Sucursal', icon: <Store />, description: branchName },
              { term: 'Solicitado', icon: <CalendarClock />, description: formatDateTime(delivery.createdAt) },
            ]}
          />
        </section>
        <section aria-labelledby="price-title" className="flex flex-col gap-4 rounded-xl bg-surface-sunken p-5">
          <h2 id="price-title" className="text-lg font-bold">Precio de la solicitud</h2>
          <PriceBreakdown lines={priceLines(delivery.pricing.lines)} totalMinor={delivery.pricing.amountMinor} totalLabel="Total del envío" footnote={`${pricingSource()}.`} />
        </section>
      </div>
    </div>
  );
}
