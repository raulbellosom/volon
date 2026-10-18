import {
  parseCreateDeliveryRequest, parseIdempotencyKey, InvalidDeliveryRequest, InvalidIdempotencyKey,
} from '@delivery/contracts';
import type { QuoteActor } from '../pricing/quote.service.ts';
import { createDeliveryService, DeliveryFailure, type DeliveryStore } from './delivery.service.ts';
import { problem } from '../../http/problem.ts';

export interface DeliveryHttpDependencies extends DeliveryStore {
  readonly authenticate: (request: Request) => Promise<QuoteActor | null>;
}

export function createDeliveryHandler(dependencies: DeliveryHttpDependencies) {
  const create = createDeliveryService(dependencies);
  return async (request: Request): Promise<Response> => {
    const path = new URL(request.url).pathname;
    const id = /^\/v1\/deliveries\/([A-Za-z0-9_-]{1,128})$/.exec(path)?.[1];
    if (path !== '/v1/deliveries' && !id) return problem(404, 'NOT_FOUND', 'Recurso no encontrado.');
    const method = id ? 'GET' : 'POST';
    if (request.method !== method) {
      const response = problem(405, 'METHOD_NOT_ALLOWED', 'Método no permitido.');
      response.headers.set('allow', method);
      return response;
    }
    try {
      const actor = await dependencies.authenticate(request);
      if (!actor?.subjectId) return problem(401, 'UNAUTHENTICATED', 'Autenticación requerida.');
      if (id) {
        const result = await dependencies.readDelivery(actor, id);
        return result ? Response.json(result, { headers: { 'cache-control': 'no-store' } })
          : problem(404, 'NOT_FOUND', 'Recurso no encontrado.');
      }
      if (request.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() !== 'application/json') {
        return problem(415, 'UNSUPPORTED_MEDIA_TYPE', 'Se requiere JSON.');
      }
      const key = parseIdempotencyKey(request.headers.get('idempotency-key'));
      let body: unknown;
      try { body = await request.json(); }
      catch { return problem(400, 'INVALID_JSON', 'JSON inválido.'); }
      const result = await create(actor, parseCreateDeliveryRequest(body), key);
      return Response.json(result, { status: 201, headers: { 'cache-control': 'no-store' } });
    } catch (error) {
      if (error instanceof InvalidDeliveryRequest) return problem(422, 'INVALID_DELIVERY_REQUEST', error.message);
      if (error instanceof InvalidIdempotencyKey) return problem(422, 'INVALID_IDEMPOTENCY_KEY', error.message);
      if (error instanceof DeliveryFailure) {
        const status = error.code === 'ACCESS_DENIED' ? 403 : error.code === 'QUOTE_NOT_FOUND' ? 404 : 409;
        return problem(status, error.code, 'No fue posible confirmar la solicitud de entrega.');
      }
      return problem(503, 'SERVICE_UNAVAILABLE', 'Servicio temporalmente no disponible.');
    }
  };
}
