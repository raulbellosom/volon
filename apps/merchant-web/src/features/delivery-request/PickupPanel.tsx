import { Alert, Badge, Button, Skeleton } from '@delivery/ui-web';
import { MapPinOff, RotateCw, Store } from 'lucide-react';
import type { PickupLocationResponse } from '../../api/merchant-api.ts';
import type { ResourceState } from '../../shared/useResource.ts';

function pickupProblem(kind: string): string {
  if (kind === 'not-found' || kind === 'forbidden') return 'Esta sucursal no está disponible para tu cuenta. Elige otra o pide acceso.';
  if (kind === 'offline') return 'Sin conexión. Revisa tu internet e inténtalo de nuevo.';
  return 'El servicio no respondió. Inténtalo de nuevo en unos momentos.';
}

/** Pickup as the server returned it: branch record coordinates, no street address, unverified. */
export function PickupPanel({ pickup, branchName }: { pickup: ResourceState<PickupLocationResponse>; branchName: string }) {
  if (pickup.status === 'error') {
    const retryable = pickup.error.kind !== 'not-found' && pickup.error.kind !== 'forbidden';
    return (
      <Alert
        tone="danger"
        live="assertive"
        title="No pudimos obtener la ubicación de recogida"
        {...(retryable ? { actions: <Button size="sm" variant="secondary" leadingIcon={<RotateCw />} onPress={pickup.reload}>Reintentar</Button> } : {})}
      >
        {pickupProblem(pickup.error.kind)} Sin esa ubicación no se puede cotizar.
      </Alert>
    );
  }

  return (
    <section aria-labelledby="pickup-title" aria-busy={pickup.status === 'loading'} className="flex items-start gap-3 rounded-xl bg-surface-sunken p-4">
      <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-selected text-text-on-secondary [&_svg]:size-4.5">
        <Store />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h3 id="pickup-title" className="text-xs font-bold uppercase tracking-overline text-text-secondary">Recogida</h3>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="text-md font-semibold text-text-primary">{branchName}</p>
          {pickup.status === 'ready' && <Badge tone="warning" size="sm" icon={<MapPinOff />}>Sin verificar</Badge>}
        </div>
        {pickup.status === 'loading' ? (
          <Skeleton className="h-4 w-56" />
        ) : (
          <p className="text-sm text-text-secondary">Ubicación obtenida del registro de la sucursal. No incluye dirección escrita.</p>
        )}
      </div>
    </section>
  );
}
