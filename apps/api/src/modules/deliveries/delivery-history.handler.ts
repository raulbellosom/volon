import { InvalidDeliveryHistoryQuery, parseDeliveryHistoryQuery } from '@delivery/contracts';
import type { QuoteActor } from '../pricing/quote.service.ts';
import { createDeliveryHistoryService, type DeliveryHistoryStore } from './delivery-history.service.ts';
import { problem } from '../../http/problem.ts';

export function createDeliveryHistoryHandler(dependencies: DeliveryHistoryStore & {
  readonly authenticate: (request: Request) => Promise<QuoteActor | null>;
}) {
  const history = createDeliveryHistoryService(dependencies);
  return async (request: Request): Promise<Response> => {
    try {
      const actor = await dependencies.authenticate(request);
      if (!actor?.subjectId) return problem(401, 'UNAUTHENTICATED', 'Autenticación requerida.');
      const query = parseDeliveryHistoryQuery(new URL(request.url).searchParams);
      const page = await history(actor, query);
      return page ? Response.json(page, { headers: { 'cache-control': 'no-store' } })
        : problem(404, 'NOT_FOUND', 'Recurso no encontrado.');
    } catch (error) {
      if (error instanceof InvalidDeliveryHistoryQuery) return problem(422, 'INVALID_DELIVERY_HISTORY_QUERY', error.message);
      return problem(503, 'SERVICE_UNAVAILABLE', 'Servicio temporalmente no disponible.');
    }
  };
}
