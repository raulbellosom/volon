import { Alert, Button, PriceBreakdown, RouteSummary, SkeletonText, SpinnerIcon } from '@delivery/ui-web';
import { ArrowLeft, CircleCheck, RotateCw } from 'lucide-react';
import { pricingSource } from '../../shared/pricing-notice.ts';
import { problemCopy } from '../../shared/ProblemState.tsx';
import { formatClock, useCountdown } from '../../shared/useCountdown.ts';
import { useOnlineStatus } from '../../shared/useOnlineStatus.ts';
import { priceLines } from './price-lines.ts';
import type { DeliveryRequestState } from './useDeliveryRequest.ts';
import { StepActions, StepSection } from './StepSection.tsx';

/** Typed by the merchant and shown only here: the delivery contract does not store it yet. */
function DropoffNote({ reference }: { reference: string }) {
  return (
    <>
      {reference && <span className="block">Indicaciones: {reference}</span>}
      <span className="block">Capturada en esta pantalla; todavía no se guarda con el envío.</span>
    </>
  );
}

interface QuoteStepProps {
  request: DeliveryRequestState;
  branchName: string;
}

export function QuoteStep({ request, branchName }: QuoteStepProps) {
  const { quote, submit, destination } = request;
  const online = useOnlineStatus();
  const secondsLeft = useCountdown(quote.status === 'ready' ? quote.quote.expiresAt : null);
  const expired = (quote.status === 'ready' && secondsLeft === 0) || (submit.status === 'error' && submit.error.kind === 'quote-expired');
  const submitError = submit.status === 'error' && submit.error.kind !== 'quote-expired' ? submit.error : null;
  const requote = () => void request.requestQuote();

  return (
    <StepSection title="Revisa la cotización" description="Revisa el desglose y confírmalo para solicitar el envío.">
      <RouteSummary
        pickup={{ name: branchName, address: 'La dirección de la sucursal aún no está en el sistema' }}
        dropoff={{ name: destination.address || 'Sin dirección', address: <DropoffNote reference={destination.reference} /> }}
      />

      {quote.status === 'loading' && (
        <div role="status" className="flex flex-col gap-3">
          <span className="flex items-center gap-2 text-sm font-semibold text-text-secondary"><SpinnerIcon size="sm" />Calculando el precio…</span>
          <SkeletonText lines={3} />
        </div>
      )}

      {quote.status === 'error' && (
        <Alert tone="danger" live="assertive" title={problemCopy(quote.error).title} actions={<Button size="sm" variant="secondary" leadingIcon={<RotateCw />} onPress={requote}>Cotizar de nuevo</Button>}>
          {quote.error.code === 'OUTSIDE_COVERAGE' ? 'El destino quedó fuera de la zona de servicio.' : problemCopy(quote.error).description}
        </Alert>
      )}

      {quote.status === 'ready' && (
        <PriceBreakdown
          lines={priceLines(quote.quote.lines)}
          totalMinor={quote.quote.amountMinor}
          totalLabel="Total del envío"
          footnote={`${expired ? 'Esta cotización ya no es válida' : `Cotización válida ${formatClock(secondsLeft)} min más`} · ${pricingSource()}.`}
        />
      )}

      {expired && (
        <Alert tone="warning" live="polite" title="La cotización venció" actions={<Button size="sm" variant="secondary" leadingIcon={<RotateCw />} onPress={requote}>Cotizar de nuevo</Button>}>
          Cada cotización vale solo unos minutos. Vuelve a cotizar para confirmar el envío.
        </Alert>
      )}

      {submitError && (
        <Alert tone="danger" live="assertive" title="No pudimos confirmar el envío">
          {problemCopy(submitError).description} Reintentar no crea un envío duplicado.
        </Alert>
      )}

      <StepActions>
        <Button variant="ghost" leadingIcon={<ArrowLeft />} onPress={() => request.setStep('destination')}>Cambiar destino</Button>
        <Button
          size="lg"
          isDisabled={quote.status !== 'ready' || expired || !online}
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
