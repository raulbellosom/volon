import { Button, DescriptionList, IconChip, LinkButton, formatMXN } from '@delivery/ui-web';
import { CalendarClock, CircleCheckBig, Hash, PackagePlus, Radar, Wallet } from 'lucide-react';
import type { DeliveryResponse } from '../../api/merchant-api.ts';
import { formatDateTime } from '../../shared/format-date.ts';

export function DoneStep({ delivery, onRestart }: { delivery: DeliveryResponse; onRestart: () => void }) {
  return (
    <section aria-labelledby="step-title" role="status" className="flex flex-col items-start gap-6">
      <div className="flex items-center gap-4">
        <IconChip icon={<CircleCheckBig />} tone="success" size="lg" />
        <div className="flex flex-col gap-1">
          <h2 id="step-title" tabIndex={-1} className="text-xl font-bold text-text-primary outline-none">Solicitud enviada</h2>
          <p className="text-md text-text-secondary">Registramos tu envío. Guarda el folio para consultarlo.</p>
        </div>
      </div>
      <DescriptionList
        layout="grid"
        className="w-full"
        items={[
          { term: 'Folio', icon: <Hash />, description: <span className="break-all font-mono text-sm">{delivery.deliveryId}</span> },
          { term: 'Total del envío', icon: <Wallet />, description: formatMXN(delivery.pricing.amountMinor) },
          { term: 'Solicitado', icon: <CalendarClock />, description: formatDateTime(delivery.createdAt) },
        ]}
      />
      <div className="flex w-full flex-col gap-3 sm:flex-row">
        <LinkButton href={`/envios/${encodeURIComponent(delivery.deliveryId)}`} variant="primary" size="lg" leadingIcon={<Radar />}>
          Ver estado del envío
        </LinkButton>
        <Button variant="ghost" size="lg" leadingIcon={<PackagePlus />} onPress={onRestart}>Solicitar otro</Button>
      </div>
    </section>
  );
}
