import { Alert, Button, DeliveryList, DeliveryListItem, EmptyState, LinkButton, Skeleton, SkeletonText } from '@delivery/ui-web';
import { ChevronDown, PackageOpen, PackagePlus, RotateCw } from 'lucide-react';
import type { ApiError } from '../../api/api-error.ts';
import { useSession } from '../../session/useSession.ts';
import { formatDateTime } from '../../shared/format-date.ts';
import { ProblemState, problemCopy } from '../../shared/ProblemState.tsx';
import type { BranchOption } from '../../workspace/WorkspaceProvider.tsx';
import { useDeliveryHistory } from './useDeliveryHistory.ts';

/** History-specific wording: a 404 here means the branch, not a folio, is out of reach. */
function historyProblemCopy(error: ApiError): { title: string; description: string } | null {
  if (error.kind === 'not-found' || error.kind === 'forbidden') {
    return {
      title: 'No tienes acceso al historial de esta sucursal',
      description: 'Puede que ya no tengas permiso en ella. Elige otra sucursal o pide acceso a quien administra tu comercio.',
    };
  }
  if (error.kind === 'invalid' || error.kind === 'unexpected') {
    return { title: 'No pudimos mostrar el historial', description: 'La respuesta no fue válida. Intenta de nuevo en unos momentos.' };
  }
  return null;
}

function HistoryProblem({ error, onRetry }: { error: ApiError; onRetry: () => void }) {
  const copy = historyProblemCopy(error);
  // Lost access needs another branch, not a retry; anything else may be transient.
  const retryable = error.kind !== 'not-found' && error.kind !== 'forbidden';
  return <ProblemState error={error} onRetry={onRetry} retryable={retryable} {...(copy ?? {})} />;
}

function HistorySkeleton() {
  return (
    <div role="status" aria-busy="true" className="flex flex-col divide-y divide-border-subtle rounded-xl border border-border-subtle bg-surface">
      <span className="sr-only">Cargando envíos…</span>
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex items-center gap-4 px-5 py-4">
          <Skeleton shape="circle" className="size-10" />
          <SkeletonText lines={2} className="flex-1" />
          <Skeleton className="h-6 w-16" />
        </div>
      ))}
    </div>
  );
}

/** Newest deliveries of the active branch with «Cargar más». Mount with a key per user and branch. */
export function DeliveryHistory({ branch }: { branch: BranchOption }) {
  const { api } = useSession();
  const { state, reload, loadMore } = useDeliveryHistory(api, branch.branchId);
  const refresh = () => void reload();

  return (
    <section aria-labelledby="recent-title" className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 id="recent-title" className="text-lg font-bold text-text-primary">Envíos recientes</h2>
        <Button variant="ghost" size="sm" leadingIcon={<RotateCw />} isDisabled={state.status === 'loading'} onPress={refresh}>
          Actualizar
        </Button>
      </div>

      {state.status === 'loading' && <HistorySkeleton />}

      {state.status === 'error' && (
        <div className="rounded-xl border border-dashed border-border">
          <HistoryProblem error={state.error} onRetry={refresh} />
        </div>
      )}

      {state.status === 'ready' && state.items.length === 0 && (
        <div className="rounded-xl border border-dashed border-border">
          <EmptyState
            icon={<PackageOpen />}
            title="Aún no hay envíos en esta sucursal"
            description="Cuando solicites uno, aparecerá aquí con su folio, fecha, estado y monto."
            actions={<LinkButton href="/envios/nuevo" variant="secondary" leadingIcon={<PackagePlus />}>Solicitar el primero</LinkButton>}
          />
        </div>
      )}

      {state.status === 'ready' && state.items.length > 0 && (
        <>
          <DeliveryList aria-label={`Envíos de ${branch.branchName}`}>
            {state.items.map((delivery) => (
              <DeliveryListItem
                key={delivery.deliveryId}
                href={`/envios/${encodeURIComponent(delivery.deliveryId)}`}
                title={formatDateTime(delivery.createdAt)}
                reference={delivery.publicReference}
                status="requested"
                statusLabel="Solicitado"
                amountMinor={delivery.pricing.amountMinor}
              />
            ))}
          </DeliveryList>
          <p role="status" className="sr-only">{`Mostrando ${state.items.length} envíos.`}</p>
          {state.more.status === 'error' && (
            <Alert tone="danger" live="assertive" title="No pudimos cargar más envíos">
              {problemCopy(state.more.error).description}
            </Alert>
          )}
          {state.nextCursor ? (
            <div className="flex justify-center">
              <Button variant="secondary" leadingIcon={<ChevronDown />} isPending={state.more.status === 'loading'} onPress={() => void loadMore()}>
                {state.more.status === 'error' ? 'Reintentar' : 'Cargar más'}
              </Button>
            </div>
          ) : (
            <p className="text-center text-sm text-text-secondary">No hay más envíos en esta sucursal.</p>
          )}
        </>
      )}
    </section>
  );
}
