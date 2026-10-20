import { CheckoutTestFailure } from '../../modules/payments/checkout-sandbox.port.ts';
import { STRIPE_TEST_API_VERSION, stripeId, testApiKeyPattern, testWebhookSecretPattern } from './config.ts';

/** Pure inspection: no files, clients, fetch, credentials provisioning, tunnels or approval flags. */
export function stripeSandboxPreflight(env: Readonly<Record<string, string | undefined>>) {
  const apiKey = env.STRIPE_SANDBOX_API_KEY;
  const webhookSecret = env.STRIPE_SANDBOX_WEBHOOK_SECRET;
  const accountId = env.STRIPE_SANDBOX_ACCOUNT_ID;
  if (env.NODE_ENV === 'production' || (apiKey !== undefined && !testApiKeyPattern.test(apiKey))
    || (webhookSecret !== undefined && !testWebhookSecretPattern.test(webhookSecret))
    || (accountId !== undefined && !stripeId(accountId, 'acct_'))) throw new CheckoutTestFailure('CONFIGURATION_INVALID');
  return {
    scope: 'offline-inspection', apiVersion: STRIPE_TEST_API_VERSION, networkCalls: 0, readyForExternalCalls: false,
    checks: { apiKey: apiKey === undefined ? 'missing' : 'test-format-unverified',
      webhookSecret: webhookSecret === undefined ? 'missing' : 'format-unverified',
      accountId: accountId === undefined ? 'missing' : 'format-unverified' },
    blockers: ['Aprobación separada de llamadas Stripe Test y plan con límites de transacciones.',
      'Cuenta Test y secretos de prueba mediante gestor seguro; no pegarlos en conversaciones.',
      'Almacén durable aprobado para reservas, binding y replay; no mutar not_submitted.',
      'Transporte HTTPS acotado y revisado; este corte no incluye transporte de red.',
      'Recepción privada de webhooks y política de privacidad/retención revisadas.'],
    operationalEligibility: false,
    guide: 'docs/specification/stripe-checkout-test.md',
  } as const;
}
