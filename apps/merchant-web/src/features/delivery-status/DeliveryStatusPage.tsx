import { Alert, Button, LinkButton, StatusBadge } from '@delivery/ui-web';
import { House, RotateCw } from 'lucide-react';
import { useParams } from 'react-router';
import { useSession } from '../../session/useSession.ts';
import { LoadingState } from '../../shared/LoadingState.tsx';
import { PageHeader } from '../../shared/PageHeader.tsx';
import { ProblemState } from '../../shared/ProblemState.tsx';
import { useResource } from '../../shared/useResource.ts';
import { useWorkspace } from '../../workspace/useWorkspace.ts';
import { DeliveryDetails } from './DeliveryDetails.tsx';

export function DeliveryStatusPage() {
  const { deliveryId = '' } = useParams();
  const { api } = useSession();
  const { branches } = useWorkspace();
  const delivery = useResource(deliveryId, () => api.getDelivery(deliveryId));

  if (delivery.status === 'loading') return <LoadingState label="Cargando el envío…" />;
  if (delivery.status === 'error') {
    return (
      <ProblemState
        error={delivery.error}
        onRetry={delivery.reload}
        {...(delivery.error.kind === 'not-found' ? { title: 'No encontramos este envío' } : {})}
        actions={<LinkButton href="/" variant="ghost" leadingIcon={<House />}>Volver al inicio</LinkButton>}
      />
    );
  }

  const branchName = branches.find((branch) => branch.branchId === delivery.data.branchId)?.branchName ?? 'Sucursal';
  return (
    <>
      <PageHeader
        overline={branchName}
        title="Estado del envío"
        actions={<StatusBadge status="requested" label="Solicitado" />}
      />
      <Alert
        tone="info"
        title="El seguimiento en vivo aún no está disponible"
        actions={<Button size="sm" variant="secondary" leadingIcon={<RotateCw />} onPress={delivery.reload}>Actualizar</Button>}
      >
        Esta pantalla muestra el último estado registrado. Actualízala para ver cambios.
      </Alert>
      <DeliveryDetails delivery={delivery.data} branchName={branchName} />
    </>
  );
}
