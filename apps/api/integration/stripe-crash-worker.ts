// Child process used only by recovery integration tests. No external transport.
import { createDatabase } from '../src/infrastructure/database.ts';
import { loadOfflineIntegrationEnvironment } from './integration-environment.ts';
import { createPostgresCheckoutSandboxStore } from '../src/infrastructure/stripe-test/postgres-store.ts';
import { StripeCheckoutTestAdapter } from '../src/infrastructure/stripe-test/adapter.ts';
import { OfflineStripe, fixtureSecrets } from '../tests/stripe-test.fixtures.ts';
import type { CheckoutSandboxFixture } from '../src/modules/payments/checkout-sandbox.port.ts';

loadOfflineIntegrationEnvironment();
const [subjectId, id, suffix] = process.argv.slice(2);
if (!subjectId || !id || !suffix || !process.env.DATABASE_URL || process.env.LOCAL_SYNTHETIC_MODE !== 'true') process.exit(1);
globalThis.fetch = async () => { throw new Error('External network forbidden'); };
const db = createDatabase(process.env.DATABASE_URL);
const fixture: CheckoutSandboxFixture = { intentId: id, purpose: 'isolated-payment-fixture', currency: 'MXN',
  amountMinor: 4400, submission: null, adverse: null, state: 'pending', events: new Map() };
const remote = new OfflineStripe(fixture, suffix);
remote.intercept = (r) => r.method === 'POST' ? (async () => {
  // The simulated provider accepted this key, but the worker never commits its response.
  process.send?.({ posted: true, key: r.headers['Idempotency-Key'], body: r.body });
  await new Promise(() => {});
  return { status: 200, body: new Uint8Array() };
})() : null;
try {
  await new StripeCheckoutTestAdapter({ config: { environment: 'offline-test', accountId: 'acct_offline',
    returnOrigin: 'http://127.0.0.1:5173' }, secrets: async () => fixtureSecrets,
    store: createPostgresCheckoutSandboxStore(db, 1000), transport: remote.transport })
    .create({ subjectId }, { intentId: id });
} finally { await db.$disconnect(); }
