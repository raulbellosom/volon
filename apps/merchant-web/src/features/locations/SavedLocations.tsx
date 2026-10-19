import { Badge, RouteSummary } from '@delivery/ui-web';
import { FlaskConical, History, MapPinOff } from 'lucide-react';
import type { DeliveryLocationsResponse } from '../../api/merchant-api.ts';

/**
 * Pickup and drop-off exactly as the server stored them in the quote or delivery snapshot,
 * not as the form currently says. Every location is shown as unverified; older records
 * (`legacy_input`) say plainly that they kept no address.
 */
export function SavedLocations({ locations, branchName }: { locations: DeliveryLocationsResponse; branchName: string }) {
  const { pickup, dropoff } = locations;
  const legacy = dropoff.source === 'legacy_input';
  const dropoffNote = dropoff.instructions
    ? `Indicaciones: ${dropoff.instructions}`
    : legacy ? 'Envío anterior: no conserva dirección ni indicaciones.' : 'Sin indicaciones.';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Badge tone="warning" icon={<MapPinOff />}>Ubicación sin verificar</Badge>
        {legacy
          ? <Badge tone="neutral" icon={<History />}>Registro anterior</Badge>
          : <Badge tone="info" icon={<FlaskConical />}>Dirección ficticia de prueba</Badge>}
      </div>
      <RouteSummary
        pickup={{
          name: branchName,
          address: pickup.source === 'branch_record'
            ? 'Ubicación del registro de la sucursal; no incluye dirección escrita.'
            : 'Registro anterior: no se conservó el origen de esta ubicación.',
        }}
        dropoff={{ name: dropoff.addressLine ?? 'Sin dirección guardada', address: dropoffNote }}
      />
    </div>
  );
}
