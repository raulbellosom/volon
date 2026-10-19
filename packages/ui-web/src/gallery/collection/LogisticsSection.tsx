import { DeliveryList, DeliveryListItem } from '../../components/logistics/DeliveryList.tsx';
import { ConnectionStatus } from '../../components/logistics/ConnectionStatus.tsx';
import { PriceBreakdown } from '../../components/logistics/PriceBreakdown.tsx';
import { RouteSummary } from '../../components/logistics/RouteSummary.tsx';
import { Timeline } from '../../components/logistics/Timeline.tsx';
import { ShowroomSection, Specimen, SpecimenGrid } from './Showroom.tsx';

/** Synthetic delivery used only to showcase the patterns. */
export function LogisticsSection() {
  return (
    <ShowroomSection
      id="logistica"
      title="Patrones de entrega"
      description="Bloques reutilizables para envíos, desacoplados del backend: historial, desglose del servidor sin sumar montos, ruta sin ETA inventada y frescura del seguimiento."
    >
      <SpecimenGrid>
        <Specimen title="Timeline" storyId="logística-timeline--in-card">
          <Timeline
            aria-label="Historial del envío PV-1042"
            events={[
              { id: 'r', title: 'Envío solicitado', time: '13:40', state: 'done' },
              { id: 'a', title: 'Repartidor asignado', time: '13:46', state: 'done' },
              { id: 'p', title: 'Paquete recogido', time: '14:05', state: 'current' },
              { id: 'd', title: 'Entregado', state: 'upcoming' },
            ]}
          />
        </Specimen>
        <Specimen title="RouteSummary" storyId="logística-routesummary--variants">
          <RouteSummary
            pickup={{ name: 'Sucursal Centro', address: 'Juárez 120, Centro', time: 'Recoger 14:05' }}
            dropoff={{ name: 'Ana López', address: 'Venustiano Carranza 245, Emiliano Zapata', time: 'Ventana 14:30 – 15:00' }}
            distanceMeters={3240}
            durationMinutes={18}
          />
        </Specimen>
        <Specimen title="PriceBreakdown" storyId="logística-pricebreakdown--quote-card" note="Montos de ejemplo">
          <PriceBreakdown
            lines={[
              { id: 'base', label: 'Tarifa base', amountMinor: 4500 },
              { id: 'distance', label: 'Distancia de ruta', amountMinor: 1500 },
              { id: 'promo', label: 'Primer envío', amountMinor: 1000, kind: 'discount' },
            ]}
            totalMinor={5000}
            footnote="Precio válido por 10 minutos."
          />
        </Specimen>
        <Specimen title="ConnectionStatus" storyId="logística-connectionstatus--states">
          <div className="flex flex-wrap gap-2">
            <ConnectionStatus state="live" lastUpdated="hace 5 s" />
            <ConnectionStatus state="stale" lastUpdated="hace 3 min" />
            <ConnectionStatus state="reconnecting" />
            <ConnectionStatus state="offline" />
          </div>
        </Specimen>
      </SpecimenGrid>
      <Specimen title="DeliveryList" storyId="logística-deliverylist--history" note="Folios y montos de ejemplo">
        <DeliveryList aria-label="Envíos de Sucursal Centro">
          <DeliveryListItem href="#envio-1" title="18 oct 2026, 2:05 p.m." reference="35855628-1965-4f53-9743-2cd76a27a6bf" status="requested" statusLabel="Solicitado" amountMinor={6150} />
          <DeliveryListItem href="#envio-2" title="17 oct 2026, 7:12 p.m." reference="PV-1042" status="delivered" amountMinor={3500} />
        </DeliveryList>
      </Specimen>
    </ShowroomSection>
  );
}
