import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { admin, db, identity, withSubject } from './payment-fixtures.ts';
import { StripeCheckoutTestAdapter } from '../src/infrastructure/stripe-test/adapter.ts';
import { createPostgresCheckoutSandboxStore } from '../src/infrastructure/stripe-test/postgres-store.ts';
import { OfflineStripe, fixtureSecrets } from '../tests/stripe-test.fixtures.ts';
import type { CheckoutSandboxFixture } from '../src/modules/payments/checkout-sandbox.port.ts';
export { admin, db, identity, withSubject, createPostgresCheckoutSandboxStore, StripeCheckoutTestAdapter };
export { eventBytes, signStripeFixture } from '../tests/stripe-test.fixtures.ts';

export async function durable(leaseMs = 30000, tenant = 'a') {
  const actor = await identity(tenant);
  const scenario = await admin.stripeSandboxScenario.create({ data: { id: randomUUID(), subjectId: actor.subjectId,
    branchId: `branch_synthetic_${tenant}`, merchantId: `merchant_synthetic_${tenant}`,
    accountId: 'acct_offline', amountMinor: 4400 } });
  const fixture: CheckoutSandboxFixture = { purpose: 'isolated-payment-fixture', intentId: scenario.id,
    amountMinor: scenario.amountMinor, currency: 'MXN', state: 'pending', submission: null, adverse: null, events: new Map() };
  const remote = new OfflineStripe(fixture, randomUUID().replaceAll('-', ''));
  const store = createPostgresCheckoutSandboxStore(db, leaseMs);
  const options = { config: { environment: 'offline-test' as const, accountId: scenario.accountId,
    returnOrigin: 'http://127.0.0.1:5173' }, secrets: async () => fixtureSecrets, store, transport: remote.transport };
  const input = { intentId: scenario.id };
  return { actor, scenario, remote, store, options, input, adapter: new StripeCheckoutTestAdapter(options) };
}
export function deferred() {
  let resolve = () => {};
  const promise = new Promise<void>((r) => { resolve = r; });
  return { promise, resolve };
}
export const pause = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
export async function scopedCount(actor: { subjectId: string }, id: string) {
  return withSubject(db, actor, async (tx) => {
    await tx.$queryRaw`SELECT set_config('app.stripe_sandbox','offline-test-v1',true)`;
    return tx.stripeSandboxSubmission.count({ where: { scenarioId: id } });
  });
}
/** Block every external host; local Auth/API remain real. */
export function localOnlyFetch(original: typeof fetch): typeof fetch {
  return (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname), 'External network forbidden');
    return original(input, init);
  };
}
