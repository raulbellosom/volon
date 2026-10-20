import { execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createDatabase } from '../../apps/api/src/infrastructure/database.ts';
import { createSupabaseAuthenticator } from '../../apps/api/src/infrastructure/supabase-auth.adapter.ts';
import { CheckoutTestFailure } from '../../apps/api/src/modules/payments/checkout-sandbox.port.ts';
import { uuid } from '../../apps/api/src/modules/payments/payment.contract.ts';
import { assertLocalStripeTerminal, assertLocalStripeServices } from '../../apps/api/src/infrastructure/stripe-test/https-policy.ts';
import { stripeTrialDigest, validateStripeTrialPlan, assertStripeTrialApproval } from '../../apps/api/src/infrastructure/stripe-test/trial-plan.ts';
import { loadStripeTrialPlan, firstStripeTrialStore, executeStripeTrial } from '../../apps/api/src/infrastructure/stripe-test/trial-service.ts';
import { createPostgresCheckoutSandboxStore } from '../../apps/api/src/infrastructure/stripe-test/postgres-store.ts';
import { createApprovedStripeTestTransport } from '../../apps/api/src/infrastructure/stripe-test/https-transport.ts';
import { StripeCheckoutTestAdapter } from '../../apps/api/src/infrastructure/stripe-test/adapter.ts';
import { validateStripeTestSecrets } from '../../apps/api/src/infrastructure/stripe-test/config.ts';
import { readHiddenStripeValue } from './stripe-hidden-input.ts';

const file = '.local/stripe-trial-plan.json'; // Only public plan, never credentials or event bodies.
async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || (args.length === 1 && args[0] === '--preflight')) {
    console.log(JSON.stringify({ readyForExternalCalls: false, operationalEligibility: false, networkCalls: 0,
      requires: ['Terminal local y Auth sintética', 'Fixture MXN 44.00 y plan/hash revisados',
        'Aprobación independiente de llamadas Test', 'Clave Test por entrada oculta; nunca en chat o env'] }));
    return;
  }
  assertLocalStripeTerminal(process.env, !!process.stdin.isTTY && !!process.stdout.isTTY);
  if (process.execArgv.some((a) => a !== '--experimental-strip-types')) throw new CheckoutTestFailure('TRANSPORT_DISABLED');
  let operation: 'create' | 'reconcile';
  let id: string;
  const preview = args[0] === '--plan';
  if (preview && args.length === 3 && (args[1] === 'create' || args[1] === 'reconcile') && args[2]) {
    operation = args[1]; id = args[2];
  } else if (args.length === 3 && (args[0] === '--create' || args[0] === '--reconcile') && args[1] && /^[0-9a-f]{64}$/.test(args[2] ?? '')) {
    operation = args[0] === '--create' ? 'create' : 'reconcile'; id = args[1];
  } else throw new CheckoutTestFailure('INVALID_COMMAND');
  if (!uuid.test(id)) throw new CheckoutTestFailure('INVALID_COMMAND');
  process.loadEnvFile('.env.local'); // Existing local DB/Auth only. Stripe values here are never consumed.
  assertLocalStripeTerminal(process.env, !!process.stdin.isTTY && !!process.stdout.isTTY);
  assertLocalStripeServices(process.env);
  const revision = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const bearer = await readHiddenStripeValue('Bearer de Supabase local');
  const authenticate = createSupabaseAuthenticator('http://127.0.0.1:56321', process.env.SUPABASE_PUBLISHABLE_KEY ?? '');
  const actor = await authenticate(new Request('http://127.0.0.1/stripe-trial', { headers: { authorization: 'Bearer ' + bearer } }));
  if (!actor) throw new CheckoutTestFailure('NOT_FOUND');
  const db = createDatabase(process.env.DATABASE_URL ?? '');
  try {
    if (preview) {
      const plan = await loadStripeTrialPlan(db, actor, id, operation, revision, new Date(Date.now() + 3600000).toISOString());
      await mkdir('.local', { recursive: true });
      await writeFile(file, JSON.stringify(plan, null, 2) + '\n', { mode: 0o600 });
      console.log(JSON.stringify({ plan, sha256: stripeTrialDigest(plan), readyForExternalCalls: false, stripeRequests: 0 }));
      return;
    }
    const bytes = await readFile(file);
    if (bytes.length > 8192) throw new CheckoutTestFailure('INVALID_COMMAND');
    const plan = validateStripeTrialPlan(JSON.parse(bytes.toString('utf8')));
    if (plan.scenarioId !== id || plan.operation !== operation || plan.revision !== revision
      || stripeTrialDigest(plan) !== args[2]) throw new CheckoutTestFailure('INVALID_COMMAND');
    const current = await loadStripeTrialPlan(db, actor, id, operation, revision, plan.expiresAt);
    if (stripeTrialDigest(current) !== stripeTrialDigest(plan)) throw new CheckoutTestFailure('INVALID_COMMAND');
    // First ask for approval, then read the Stripe key. No SQL lock is held while the user responds.
    const confirmation = await readHiddenStripeValue('Confirmación AUTORIZO STRIPE TEST y SHA-256');
    assertStripeTrialApproval(plan, confirmation);
    const apiKey = await readHiddenStripeValue('Clave Stripe Test');
    const secrets = validateStripeTestSecrets({ apiKey });
    const connection = createApprovedStripeTestTransport(plan, confirmation);
    const adapter = new StripeCheckoutTestAdapter({ config: { environment: 'offline-test', accountId: plan.accountId,
      returnOrigin: plan.returnOrigin }, store: operation === 'create' ? firstStripeTrialStore(db) : createPostgresCheckoutSandboxStore(db),
      secrets: async () => secrets, transport: connection.transport });
    // Reverify identity after interactive delays, before any Stripe request; RLS reauthorizes each storage phase.
    const fresh = await authenticate(new Request('http://127.0.0.1/stripe-trial', { headers: { authorization: 'Bearer ' + bearer } }));
    if (!fresh || fresh.subjectId !== actor.subjectId) throw new CheckoutTestFailure('NOT_FOUND');
    try {
      console.log(JSON.stringify({ execution: 'manual-stripe-test', observation: await executeStripeTrial(plan, fresh, adapter) }));
    } finally {
      console.log(JSON.stringify({ execution: 'manual-stripe-test', ...connection.report(), eligible: false }));
    }
  } finally { await db.$disconnect(); }
}
main().catch((error: unknown) => {
  console.error(JSON.stringify({ readyForExternalCalls: false, eligible: false,
    error: error instanceof CheckoutTestFailure ? error.code : 'INFRASTRUCTURE_UNAVAILABLE' }));
  process.exitCode = 1;
});
