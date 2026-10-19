import { Alert, Button, TextField } from '@delivery/ui-web';
import { ArrowLeft, Calculator, MapPin, MessageSquareText } from 'lucide-react';
import type { LocationSource } from '../../geo/location-source.ts';
import { useOnlineStatus } from '../../shared/useOnlineStatus.ts';
import type { DeliveryRequestState } from './useDeliveryRequest.ts';
import { StepActions, StepSection } from './StepSection.tsx';

export function DestinationStep({ request, locations }: { request: DeliveryRequestState; locations: LocationSource | null }) {
  const online = useOnlineStatus();
  const { destination, setDestination } = request;
  const canQuote = Boolean(locations) && online && destination.address.trim().length > 0;

  return (
    <StepSection title="¿A dónde va?" description="Escribe la dirección de entrega como la diría tu cliente.">
      <div className="flex flex-col gap-5">
        <TextField
          label="Dirección de entrega"
          description="Calle, número y colonia."
          icon={<MapPin />}
          name="address"
          autoComplete="street-address"
          isRequired
          value={destination.address}
          onChange={(address) => setDestination({ ...destination, address })}
        />
        <TextField
          label="Indicaciones para el repartidor"
          description="Opcional. Por ejemplo: portón azul, tocar en recepción."
          icon={<MessageSquareText />}
          name="reference"
          multiline
          value={destination.reference}
          onChange={(reference) => setDestination({ ...destination, reference })}
        />
      </div>
      {locations ? (
        <Alert tone="info" title="Ubicación de prueba">
          Aún no hay geocodificación: la cotización usa un punto sintético de desarrollo. La dirección y las indicaciones solo se muestran en esta pantalla; todavía no se envían al servidor.
        </Alert>
      ) : (
        <Alert tone="warning" title="Todavía no podemos cotizar desde aquí">
          Para calcular el precio necesitamos ubicar la dirección y la sucursal. Esa parte del servicio aún no está disponible.
        </Alert>
      )}
      <StepActions>
        <Button variant="ghost" leadingIcon={<ArrowLeft />} onPress={() => request.setStep('origin')}>Atrás</Button>
        <Button size="lg" isDisabled={!canQuote} leadingIcon={<Calculator />} onPress={() => void request.requestQuote()}>
          Cotizar envío
        </Button>
      </StepActions>
    </StepSection>
  );
}
