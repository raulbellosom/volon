import { Alert, Button, SkeletonText } from '@delivery/ui-web';
import { RotateCw } from 'lucide-react';
import { useSession } from '../../session/useSession.ts';
import { problemCopy } from '../../shared/ProblemState.tsx';
import { useResource } from '../../shared/useResource.ts';
import { SavedLocations } from '../locations/SavedLocations.tsx';

/**
 * Locations stored with this delivery, read only when its detail is opened (never in lists).
 * Nothing is cached beyond the page: leaving it drops the address from memory.
 */
export function DeliveryLocations({ deliveryId, branchName }: { deliveryId: string; branchName: string }) {
  const { api } = useSession();
  const locations = useResource(deliveryId, () => api.getDeliveryLocations(deliveryId));
  const unavailable = locations.status === 'error' && (locations.error.kind === 'not-found' || locations.error.kind === 'forbidden');

  return (
    <section aria-labelledby="locations-title" aria-busy={locations.status === 'loading'} className="flex flex-col gap-4">
      <h2 id="locations-title" className="text-lg font-bold">Ubicaciones guardadas</h2>
      {locations.status === 'loading' && <SkeletonText lines={4} />}
      {locations.status === 'error' && (
        <Alert
          tone={unavailable ? 'warning' : 'danger'}
          title={unavailable ? 'Las ubicaciones de este envío no están disponibles' : 'No pudimos cargar las ubicaciones'}
          {...(unavailable ? {} : { actions: <Button size="sm" variant="secondary" leadingIcon={<RotateCw />} onPress={locations.reload}>Reintentar</Button> })}
        >
          {unavailable ? 'Puede que ya no tengas acceso a esta sucursal.' : problemCopy(locations.error).description}
        </Alert>
      )}
      {locations.status === 'ready' && <SavedLocations locations={locations.data} branchName={branchName} />}
    </section>
  );
}
