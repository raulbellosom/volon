import type { QuoteActor } from '../pricing/quote.service.ts';
import type { LocationKeyPort, LocationLabGate, LocationLedgerPort, LocationStore } from './private-location.ports.ts';
import { assertLab, PrivateLocationFailure, syntheticPayload, uuid } from './private-location.contract.ts';
import { createPrivateLocationService, type CreatePrivateLocation } from './private-location.service.ts';

/** Internal authenticated facade. Deliberately absent from HTTP composition and exports to clients. */
export function createPrivateLocationLab(deps: {
  readonly gate: LocationLabGate; readonly store: LocationStore; readonly keys: LocationKeyPort;
  readonly ledger: LocationLedgerPort; readonly policies: readonly string[];
  readonly authenticate: (request: Request) => Promise<QuoteActor | null>;
}) {
  assertLab(deps.gate);
  if (deps.keys.kind !== 'synthetic-memory-v1' || deps.ledger.kind !== 'synthetic-memory-v1'
    || !deps.policies.length || !deps.policies.every((id) => /^synthetic-[a-z0-9-]{1,64}$/.test(id))) {
    throw new PrivateLocationFailure('UNAVAILABLE');
  }
  const policies = new Set(deps.policies);
  const service = createPrivateLocationService({ ...deps, policies });
  const run = async <T>(request: Request, action: (actor: QuoteActor) => Promise<T>): Promise<T> => {
    try {
      assertLab(deps.gate);
      const actor = await deps.authenticate(request);
      if (!actor?.subjectId) throw new PrivateLocationFailure('UNAUTHENTICATED');
      return await action(actor);
    } catch (error) {
      if (error instanceof PrivateLocationFailure) throw error;
      throw new PrivateLocationFailure('UNAVAILABLE');
    }
  };
  return {
    create: (request: Request, input: CreatePrivateLocation) => run(request, async (actor) => {
      if (!input || Object.keys(input).sort().join(',') !== 'branchId,expiresAt,fixtureId,policyId,requestId'
        || typeof input.branchId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(input.branchId)
        || !policies.has(input.policyId) || typeof input.expiresAt !== 'string'
        || !Number.isFinite(Date.parse(input.expiresAt)) || new Date(input.expiresAt).toISOString() !== input.expiresAt) {
        throw new PrivateLocationFailure('INVALID_INPUT');
      }
      uuid(input.requestId);
      syntheticPayload(input.fixtureId);
      return service.create(actor, { ...input });
    }),
    read: (request: Request, id: string) => run(request, async (actor) => { uuid(id); return service.read(actor, id); }),
    retire: (request: Request, id: string) => run(request, async (actor) => { uuid(id); return service.retire(actor, id); }),
  };
}
