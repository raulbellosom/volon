import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout } from 'node:timers/promises';
import { admin, db, courierLogin, required } from './courier-fixtures.ts';
import { withSubject } from '../src/infrastructure/database.ts';
import { createSupabaseAuthenticator } from '../src/infrastructure/supabase-auth.adapter.ts';
import { createDispatchLabRepository } from '../src/infrastructure/dispatch-lab.repository.ts';
import { createDispatchLabService } from '../src/modules/dispatch-lab/dispatch.service.ts';
import { createCourierRepository } from '../src/infrastructure/courier.repository.ts';
import { createCourierAvailabilityService } from '../src/modules/couriers/courier.service.ts';
import type { CourierActor } from '../src/modules/couriers/courier.service.ts';
import type { FinancialEligibilityPort } from '../src/modules/dispatch-lab/dispatch.ports.ts';
export { admin, db, withSubject };

// Check before any fixture connects or authenticates; never run this harness remotely.
assert.equal(process.env.LOCAL_SYNTHETIC_MODE, 'true');
for (const [variable, port] of [['SUPABASE_URL', '56321'], ['DATABASE_URL', '56322'], ['MIGRATION_DATABASE_URL', '56322']]) {
  assert.ok(variable && port);
  const destination = new URL(required(variable));
  assert.equal(destination.hostname, '127.0.0.1');
  assert.equal(destination.port, port);
}

/** ONLY positive adapter: test fixture, never imported by src/main/app or selected by env. */
export class SyntheticFinancialFixture implements FinancialEligibilityPort {
  private readonly conditions = new Map<string, ReturnType<FinancialEligibilityPort['evaluate']>>();
  evaluate(reference: string) { return this.conditions.get(reference) ?? 'missing'; }
  set(reference: string, condition: ReturnType<FinancialEligibilityPort['evaluate']>) { this.conditions.set(reference, condition); }
}
export const financial = new SyntheticFinancialFixture();
export const repository = createDispatchLabRepository(db);
export const execute = createDispatchLabService(repository, financial);
export async function scenario() {
  assert.equal(process.env.LOCAL_SYNTHETIC_MODE, 'true');
  assert.equal(new URL(required('MIGRATION_DATABASE_URL')).hostname, '127.0.0.1');
  const row = await admin.dispatchLabScenario.create({ data: { id: randomUUID() } });
  financial.set(row.id, 'synthetic-fixture');
  return row.id;
}
export async function actors() {
  const auth = createSupabaseAuthenticator(required('SUPABASE_URL'), required('SUPABASE_PUBLISHABLE_KEY'));
  const result: CourierActor[] = [];
  for (const suffix of ['a', 'b']) {
    const login = await courierLogin(suffix);
    const actor = await auth(new Request('http://localhost/lab', { headers: { authorization: `Bearer ${login.token}` } }));
    assert.ok(actor);
    const profile = await admin.courier.findUniqueOrThrow({ where: { subjectId: actor.subjectId } });
    if (!profile.enabled) await admin.courier.update({ where: { id: profile.id }, data: { enabled: true } });
    // Retain history across reruns, releasing ONLY synthetic reservations with audited commands.
    for (const row of await admin.dispatchLabAssignment.findMany({ where: { courierId: profile.id, status: 'active' } })) {
      await execute(actor, { operation: 'revoke', id: row.id, expectedVersion: row.version }, randomUUID());
    }
    const store = createCourierRepository(db);
    const current = await store.read(actor);
    assert.ok(current);
    if (current.availability.status !== 'available') await createCourierAvailabilityService(store)(actor,
      { status: 'available', expectedVersion: current.availability.version }, randomUUID());
    result.push(actor);
  }
  const [a, b] = result;
  assert.ok(a && b);
  return { a, b };
}
export function offer(actor: CourierActor, reference: string, ttlSeconds = 300, key = randomUUID()) {
  return execute(actor, { operation: 'offer', syntheticDeliveryRef: reference, ttlSeconds }, key);
}
export function accept(actor: CourierActor, id: string, key = randomUUID(), expectedVersion = 1) {
  return execute(actor, { operation: 'accept', id, expectedVersion }, key);
}
export async function waitForBlocked() {
  const deadline = Date.now() + 3000;
  while (Date.now() < deadline) {
    const [row] = await admin.$queryRaw<{ count: number }[]>`SELECT count(*)::int AS count FROM pg_stat_activity
      WHERE usename = 'delivery_api' AND wait_event = 'advisory'`;
    if (row && row.count > 0) return;
    await setTimeout(20);
  }
  throw new Error('Command did not reach PostgreSQL lock');
}
export async function blocked(lock: string, work: () => Promise<void>) {
  let release = () => {};
  let acquired = () => {};
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const ready = new Promise<void>((resolve) => { acquired = resolve; });
  const blocker = admin.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lock}, 0))::text`;
    acquired();
    await gate;
  }, { timeout: 10000 });
  await ready;
  try { await work(); } finally { release(); await blocker; }
}
