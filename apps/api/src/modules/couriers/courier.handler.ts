import { parseCourierAvailabilityRequest, parseCourierMeResponse, parseIdempotencyKey,
  InvalidCourierRequest, InvalidIdempotencyKey } from '@delivery/contracts';
import { problem } from '../../http/problem.ts';
import { createCourierAvailabilityService, CourierFailure, type CourierActor, type CourierStore } from './courier.service.ts';

interface Dependencies extends CourierStore {
  readonly authenticate: (request: Request) => Promise<CourierActor | null>;
}
export function createCourierHandler(dependencies: Dependencies) {
  const change = createCourierAvailabilityService(dependencies);
  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    const isRead = url.pathname === '/v1/couriers/me';
    if (!isRead && url.pathname !== '/v1/couriers/me/availability') return problem(404, 'NOT_FOUND', 'Recurso no encontrado.');
    const method = isRead ? 'GET' : 'POST';
    if (request.method !== method) {
      const response = problem(405, 'METHOD_NOT_ALLOWED', 'Método no permitido.');
      response.headers.set('allow', method);
      return response;
    }
    try {
      const actor = await dependencies.authenticate(request);
      if (!actor?.subjectId) return problem(401, 'UNAUTHENTICATED', 'Autenticación requerida.');
      if (url.search) throw new InvalidCourierRequest();
      let result;
      if (isRead) result = await dependencies.read(actor);
      else {
        if (request.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() !== 'application/json') {
          return problem(415, 'UNSUPPORTED_MEDIA_TYPE', 'Se requiere JSON.');
        }
        const key = parseIdempotencyKey(request.headers.get('idempotency-key'));
        let body: unknown;
        try { body = await request.json(); }
        catch { return problem(400, 'INVALID_JSON', 'JSON inválido.'); }
        result = await change(actor, parseCourierAvailabilityRequest(body), key);
      }
      if (!result) return problem(404, 'NOT_FOUND', 'Recurso no encontrado.');
      return Response.json(parseCourierMeResponse(result), { headers: { 'cache-control': 'no-store' } });
    } catch (error) {
      if (error instanceof InvalidCourierRequest) return problem(422, 'INVALID_COURIER_REQUEST', error.message);
      if (error instanceof InvalidIdempotencyKey) return problem(422, 'INVALID_IDEMPOTENCY_KEY', error.message);
      if (error instanceof CourierFailure) {
        if (error.code === 'NOT_FOUND') return problem(404, error.code, 'Recurso no encontrado.');
        return problem(409, error.code, 'Conflicto de disponibilidad.');
      }
      return problem(503, 'SERVICE_UNAVAILABLE', 'Servicio temporalmente no disponible.');
    }
  };
}
