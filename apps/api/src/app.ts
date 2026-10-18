import { InvalidQuoteRequest, parseDeliveryQuoteRequest, type DeliveryQuoteResponse } from '@delivery/contracts';
import { createQuoteService, QuoteFailure, type QuoteActor, type QuoteDependencies } from './modules/pricing/quote.service.ts';

export interface ApiDependencies extends QuoteDependencies {
  /** Return null for invalid/absent credentials. No default or development auth bypass. */
  readonly authenticate: (request: Request) => Promise<QuoteActor | null>;
  readonly readQuote?: (actor: QuoteActor, quoteId: string) => Promise<DeliveryQuoteResponse | null>;
}

function problem(status: number, code: string, title: string): Response {
  return Response.json({ type: 'about:blank', title, status, code }, {
    status, headers: { 'content-type': 'application/problem+json', 'cache-control': 'no-store' },
  });
}

/** Fetch-compatible composition root. Does not listen on a port or select a framework. */
export function createApi(dependencies: ApiDependencies): (request: Request) => Promise<Response> {
  const quote = createQuoteService(dependencies);
  return async (request) => {
    const path = new URL(request.url).pathname;
    const quoteId = /^\/v1\/delivery-quotes\/([A-Za-z0-9_-]{1,128})$/.exec(path)?.[1];
    if (path !== '/v1/delivery-quotes' && !(quoteId && dependencies.readQuote)) {
      return problem(404, 'NOT_FOUND', 'Recurso no encontrado.');
    }
    const method = quoteId ? 'GET' : 'POST';
    if (request.method !== method) {
      const response = problem(405, 'METHOD_NOT_ALLOWED', 'Método no permitido.');
      response.headers.set('allow', method);
      return response;
    }
    try {
      const actor = await dependencies.authenticate(request);
      if (!actor || !actor.subjectId) return problem(401, 'UNAUTHENTICATED', 'Autenticación requerida.');
      if (quoteId && dependencies.readQuote) {
        const result = await dependencies.readQuote(actor, quoteId);
        return result ? Response.json(result, { headers: { 'cache-control': 'no-store' } })
          : problem(404, 'NOT_FOUND', 'Recurso no encontrado.');
      }
      if (request.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() !== 'application/json') {
        return problem(415, 'UNSUPPORTED_MEDIA_TYPE', 'Se requiere JSON.');
      }
      let body: unknown;
      try { body = await request.json(); }
      catch { return problem(400, 'INVALID_JSON', 'JSON inválido.'); }
      const result = await quote(actor, parseDeliveryQuoteRequest(body));
      return Response.json(result, { status: 201, headers: { 'cache-control': 'no-store' } });
    } catch (error) {
      if (error instanceof InvalidQuoteRequest) return problem(422, 'INVALID_QUOTE_REQUEST', error.message);
      if (error instanceof QuoteFailure) {
        if (error.code === 'ACCESS_DENIED') return problem(403, error.code, 'Acceso denegado.');
        if (error.code === 'OUTSIDE_COVERAGE') return problem(422, error.code, 'Servicio fuera de cobertura.');
        return problem(503, error.code, 'No fue posible calcular la ruta.');
      }
      return problem(503, 'SERVICE_UNAVAILABLE', 'Servicio temporalmente no disponible.');
    }
  };
}
