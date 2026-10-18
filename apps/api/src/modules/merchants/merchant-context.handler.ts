import { parseMeResponse, parseMerchantBranchesResponse,
  type MerchantMembership } from '@delivery/contracts';
import type { QuoteActor } from '../pricing/quote.service.ts';
import { problem } from '../../http/problem.ts';

export interface MerchantContextStore {
  readonly readMemberships: (actor: QuoteActor, merchantId?: string) => Promise<readonly MerchantMembership[]>;
}

interface Dependencies extends MerchantContextStore {
  readonly authenticate: (request: Request) => Promise<QuoteActor | null>;
}

export function createMerchantContextHandler(dependencies: Dependencies) {
  return async (request: Request): Promise<Response> => {
    const path = new URL(request.url).pathname;
    const isMe = path === '/v1/me';
    const merchantId = /^\/v1\/merchants\/([A-Za-z0-9_-]{1,128})\/branches$/.exec(path)?.[1];
    if (!isMe && !merchantId) return problem(404, 'NOT_FOUND', 'Recurso no encontrado.');
    if (request.method !== 'GET') {
      const response = problem(405, 'METHOD_NOT_ALLOWED', 'Método no permitido.');
      response.headers.set('allow', 'GET');
      return response;
    }
    try {
      const actor = await dependencies.authenticate(request);
      if (!actor?.subjectId) return problem(401, 'UNAUTHENTICATED', 'Autenticación requerida.');
      const memberships = await dependencies.readMemberships(actor, merchantId);
      if (!isMe && memberships.length === 0) return problem(404, 'NOT_FOUND', 'Recurso no encontrado.');
      const body = isMe ? parseMeResponse({ subjectId: actor.subjectId, memberships })
        : parseMerchantBranchesResponse({ merchant: memberships[0]?.merchant,
          branches: memberships.map((entry) => entry.branch) });
      return Response.json(body, { headers: { 'cache-control': 'no-store' } });
    } catch {
      return problem(503, 'SERVICE_UNAVAILABLE', 'Servicio temporalmente no disponible.');
    }
  };
}
