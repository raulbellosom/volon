import { Alert, Button, PriceBreakdown, SkeletonText, SpinnerIcon } from '@delivery/ui-web';
import { ArrowLeft, CircleCheck, RotateCw } from 'lucide-react';
import type { ApiError } from '../../api/api-error.ts';
import { pricingSource } from '../../shared/pricing-notice.ts';
import { problemCopy } from '../../shared/ProblemState.tsx';
import { formatClock, useCountdown } from '../../shared/useCountdown.ts';
import { useOnlineStatus } from '../../shared/useOnlineStatus.ts';
import { SavedLocations } from '../locations/SavedLocations.tsx';
import { priceLines } from './price-lines.ts';
import type { DeliveryRequestState, SnapshotState } from './useDeliveryRequest.ts';
import { StepActions, StepSection } from './StepSection.tsx';

function quoteProblem(error: ApiError): string {
  if (error.code === 'OUTSIDE_COVERAGE') return 'El destino quedó fuera de la zona de servicio.';
  if (error.code === 'INVALID_QUOTE_REQUEST') return 'Revisa la dirección y las indicaciones de prueba e inténtalo de nuevo.';
  if (error.kind === 'not-found' || error.kind === 'forbidden') return 'Esta sucursal ya no está disponible para tu cuenta.';
  return problemCopy(error).description;
}

function StoredSnapshot({ snapshot, branchName, onRetry }: { snapshot: SnapshotState; branchName: string; onRetry: () => void }) {
  return (
    <section aria-labelledby="stored-title" aria-busy={snapshot.status === 'loading'} className="flex flex-col gap-3">
      <h3 id="stored-title" className="text-md font-bold text-text-primary">Así quedó guardado con la cotización</h3>
      {snapshot.status === 'loading' && <SkeletonText lines={3} />}
      {snapshot.status === 'error' && (
        <Alert tone="danger" title="No pudimos leer lo que se guardó" actions={<Button size="sm" variant="secondary" leadingIcon={<RotateCw />} onPress={onRetry}>Reintentar</Button>}>
          Para confirmar necesitamos ver la dirección tal como quedó en el servidor. {problemCopy(snapshot.error).description}
        </Alert>
      )}
      {snapshot.status === 'ready' && <SavedLocations locations={snapshot.locations} branchName={branchName} />}
    </section>
  );
}

export function QuoteStep({ request, branchName, onRequote }: { request: DeliveryRequestState; branchName: string; onRequote: () => void }) {
  const { quote, submit } = request;
  const online = useOnlineStatus();
  const secondsLeft = useCountdown(quote.status === 'ready' ? quote.quote.expiresAt : null);
  const expired = (quote.status === 'ready' && secondsLeft === 0) || (submit.status === 'error' && submit.error.kind === 'quote-expired');
  const submitError = submit.status === 'error' && submit.error.kind !== 'quote-expired' ? submit.error : null;
  const stored = quote.status === 'ready' && quote.snapshot.status === 'ready';
  const requoteButton = <Button size="sm" variant="secondary" leadingIcon={<RotateCw />} onPress={onRequote}>Cotizar de nuevo</Button>;

  return (
    <StepSection title="Revisa la cotización" description="Revisa lo que quedó guardado y el desglose; confírmalo para solicitar el envío.">
      {quote.status === 'loading' && (
        <div role="status" className="flex flex-col gap-3">
          <span className="flex items-center gap-2 text-sm font-semibold text-text-secondary"><SpinnerIcon size="sm" />Calculando el precio…</span>
          <SkeletonText lines={3} />
        </div>
      )}

      {quote.status === 'error' && (
        <Alert tone="danger" live="assertive" title={problemCopy(quote.error).title} actions={requoteButton}>
          {quoteProblem(quote.error)}
        </Alert>
      )}

      {quote.status === 'ready' && (
        <>
          <StoredSnapshot snapshot={quote.snapshot} branchName={branchName} onRetry={request.retrySnapshot} />
          <PriceBreakdown
            lines={priceLines(quote.quote.lines)}
            totalMinor={quote.quote.amountMinor}
            totalLabel="Total del envío"
            footnote={`${expired ? 'Esta cotización ya no es válida' : `Cotización válida ${formatClock(secondsLeft)} min más`} · ${pricingSource()}.`}
          />
        </>
      )}

      {expired && (
        <Alert tone="warning" live="polite" title="La cotización venció" actions={requoteButton}>
          Cada cotización vale solo unos minutos. Vuelve a cotizar para confirmar el envío.
        </Alert>
      )}

      {submitError && (
        <Alert tone="danger" live="assertive" title="No pudimos confirmar el envío">
          {submitError.kind === 'conflict'
            ? 'Esta cotización ya se usó o cambió. Vuelve a cotizar para solicitar otro envío.'
            : `${problemCopy(submitError).description} Reintentar no crea un envío duplicado.`}
        </Alert>
      )}

      <StepActions>
        <Button variant="ghost" leadingIcon={<ArrowLeft />} onPress={() => request.setStep('destination')}>Cambiar destino</Button>
        <Button
          size="lg"
          isDisabled={!stored || expired || !online || submitError?.kind === 'conflict'}
          isPending={submit.status === 'submitting'}
          leadingIcon={<CircleCheck />}
          onPress={() => void request.confirm()}
        >
          Confirmar envío
        </Button>
      </StepActions>
    </StepSection>
  );
}
