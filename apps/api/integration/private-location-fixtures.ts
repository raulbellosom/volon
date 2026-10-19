import { randomUUID } from 'node:crypto';
import { db, admin, login, required } from './delivery-fixtures.ts';
import { createPrivateLocationRepository } from '../src/infrastructure/private-location.repository.ts';
import { createSyntheticLocationKeys, createSyntheticLocationLedger } from '../src/infrastructure/synthetic-location-security.adapter.ts';
import { createPrivateLocationLab } from '../src/modules/private-locations/private-location.lab.ts';
import { createSupabaseAuthenticator } from '../src/infrastructure/supabase-auth.adapter.ts';
import { withSubject } from '../src/infrastructure/database.ts';
import type { LocationKeyPort, LocationLedgerPort, LocationStore } from '../src/modules/private-locations/private-location.ports.ts';
import type { CreatePrivateLocation } from '../src/modules/private-locations/private-location.service.ts';
export { db, admin, login, withSubject };

export const gate = { environment: 'test' as const, enabled: true, syntheticOnly: true };
export const authenticate = createSupabaseAuthenticator(required('SUPABASE_URL'), required('SUPABASE_PUBLISHABLE_KEY'));
export const request = (token = '') => new Request('http://synthetic.invalid/internal-lab', {
  headers: token ? { authorization: `Bearer ${token}` } : {},
});
export function input(overrides: Partial<CreatePrivateLocation> = {}): CreatePrivateLocation {
  return { branchId: 'branch_synthetic_a', requestId: randomUUID(), fixtureId: 'grid-a',
    policyId: 'synthetic-test', expiresAt: new Date(Date.now() + 60000).toISOString(), ...overrides };
}
export function setup(overrides: { keys?: LocationKeyPort; ledger?: LocationLedgerPort; store?: LocationStore } = {}) {
  const keys = overrides.keys ?? createSyntheticLocationKeys(gate);
  const ledger = overrides.ledger ?? createSyntheticLocationLedger(gate);
  const store = overrides.store ?? createPrivateLocationRepository(db);
  return { keys, ledger, store, lab: createPrivateLocationLab({ gate, keys, ledger, store,
    policies: ['synthetic-test'], authenticate }) };
}

export async function labRows(actor: { subjectId: string }) {
  return withSubject(db, actor, async (tx) => {
    await tx.$queryRaw`SELECT set_config('app.private_location_lab', 'synthetic-v1', true)`;
    return tx.privateLocationEnvelope.findMany();
  });
}
