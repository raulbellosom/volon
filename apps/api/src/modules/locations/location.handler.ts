import { parseDeliveryLocationsResponse, parsePickupLocationResponse,
  type DeliveryLocationsResponse, type PickupLocationResponse } from '@delivery/contracts';
import type { QuoteActor } from '../pricing/quote.service.ts';
import { problem } from '../../http/problem.ts';

export interface LocationStore {
  readonly readPickup: (actor: QuoteActor, id: string) => Promise<PickupLocationResponse | null>;
  readonly readQuoteLocations: (actor: QuoteActor, id: string) => Promise<DeliveryLocationsResponse | null>;
  readonly readDeliveryLocations: (actor: QuoteActor, id: string) => Promise<DeliveryLocationsResponse | null>;
}

export function createLocationHandler(dependencies: LocationStore & {
  readonly authenticate: (request: Request) => Promise<QuoteActor | null>;
}) {
  return async (request: Request): Promise<Response> => {
    const match = /^\/v1\/(branches|delivery-quotes|deliveries)\/([A-Za-z0-9_-]{1,128})\/(pickup-location|locations)$/.exec(new URL(request.url).pathname);
    if (!match || (match[1] === 'branches') !== (match[3] === 'pickup-location')) {
      return problem(404, 'NOT_FOUND', 'Recurso no encontrado.');
    }
    if (request.method !== 'GET') {
      const response = problem(405, 'METHOD_NOT_ALLOWED', 'Método no permitido.');
      response.headers.set('allow', 'GET');
      return response;
    }
    try {
      const actor = await dependencies.authenticate(request);
      if (!actor?.subjectId) return problem(401, 'UNAUTHENTICATED', 'Autenticación requerida.');
      const id = match[2]!;
      if (match[1] === 'branches') {
        const result = await dependencies.readPickup(actor, id);
        return result ? Response.json(parsePickupLocationResponse(result), { headers: { 'cache-control': 'no-store' } })
          : problem(404, 'NOT_FOUND', 'Recurso no encontrado.');
      }
      const result = await (match[1] === 'delivery-quotes'
        ? dependencies.readQuoteLocations : dependencies.readDeliveryLocations)(actor, id);
      return result ? Response.json(parseDeliveryLocationsResponse(result), { headers: { 'cache-control': 'no-store' } })
        : problem(404, 'NOT_FOUND', 'Recurso no encontrado.');
    } catch { return problem(503, 'SERVICE_UNAVAILABLE', 'Servicio temporalmente no disponible.'); }
  };
}
