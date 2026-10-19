import { Alert, Button, TextField } from '@delivery/ui-web';
import { ArrowLeft, Calculator, MapPin, MessageSquareText, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import type { PickupLocationResponse } from '../../api/merchant-api.ts';
import type { LocationSource } from '../../geo/location-source.ts';
import { useOnlineStatus } from '../../shared/useOnlineStatus.ts';
import type { ResourceState } from '../../shared/useResource.ts';
import { ADDRESS_MAX, codePoints, destinationErrors, INSTRUCTIONS_MAX, normalizeLine } from './destination-input.ts';
import { PickupPanel } from './PickupPanel.tsx';
import type { DeliveryRequestState } from './useDeliveryRequest.ts';
import { StepActions, StepSection } from './StepSection.tsx';

interface DestinationStepProps {
  request: DeliveryRequestState;
  locations: LocationSource | null;
  pickup: ResourceState<PickupLocationResponse>;
  branchName: string;
}

export function DestinationStep({ request, locations, pickup, branchName }: DestinationStepProps) {
  const online = useOnlineStatus();
  const [attempted, setAttempted] = useState(false);
  const { destination, setDestination } = request;
  const errors = destinationErrors(destination.address, destination.instructions);
  // Length errors show while typing; «required» only after trying to quote.
  const addressError = errors.address && (attempted || destination.address.length > 0) ? errors.address : undefined;
  const pickupReady = pickup.status === 'ready' ? pickup.data : null;
  const canQuote = Boolean(locations) && Boolean(pickupReady) && online;

  function quote() {
    setAttempted(true);
    if (Object.keys(errors).length === 0) void request.requestQuote(pickupReady);
  }

  return (
    <StepSection title="¿A dónde va?" description="Captura un destino de prueba. Se guardará junto con la cotización.">
      <Alert tone="warning" title="Usa solo direcciones ficticias">
        Este entorno es de prueba y todavía no puede borrar domicilios guardados. No escribas direcciones reales, nombres ni teléfonos.
      </Alert>

      <PickupPanel pickup={pickup} branchName={branchName} />

      <fieldset className="flex flex-col gap-5">
        <legend className="mb-4 text-xs font-bold uppercase tracking-overline text-text-secondary">Destino de prueba</legend>
        <TextField
          label="Dirección de prueba"
          description={`Ficticia y en una sola línea. ${codePoints(normalizeLine(destination.address))}/${ADDRESS_MAX}`}
          icon={<MapPin />}
          name="addressLine"
          autoComplete="off"
          isRequired
          value={destination.address}
          onChange={(address) => setDestination({ ...destination, address })}
          {...(addressError ? { isInvalid: true, errorMessage: addressError } : {})}
        />
        <TextField
          label="Indicaciones para el repartidor"
          description={`Opcional. Por ejemplo: «Portón azul de prueba». ${codePoints(normalizeLine(destination.instructions))}/${INSTRUCTIONS_MAX}`}
          icon={<MessageSquareText />}
          name="instructions"
          autoComplete="off"
          value={destination.instructions}
          onChange={(instructions) => setDestination({ ...destination, instructions })}
          {...(errors.instructions ? { isInvalid: true, errorMessage: errors.instructions } : {})}
        />
        <p className="flex items-start gap-2 text-sm text-text-secondary">
          <ShieldAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          No buscamos ni verificamos esta dirección: el punto de entrega es sintético mientras no haya un servicio de mapas aprobado.
        </p>
      </fieldset>

      {!locations && (
        <Alert tone="warning" title="Todavía no podemos cotizar desde aquí">
          Para calcular el precio necesitamos ubicar la dirección. Esa parte del servicio aún no está disponible.
        </Alert>
      )}
      <StepActions>
        <Button variant="ghost" leadingIcon={<ArrowLeft />} onPress={() => request.setStep('origin')}>Atrás</Button>
        <Button size="lg" isDisabled={!canQuote} leadingIcon={<Calculator />} onPress={quote}>
          Cotizar envío
        </Button>
      </StepActions>
    </StepSection>
  );
}
