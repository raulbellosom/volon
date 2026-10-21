import { readFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { CheckoutTestFailure } from '../../apps/api/src/modules/payments/checkout-sandbox.port.ts';
import { assertLocalStripeTerminal, assertLocalStripeServices } from '../../apps/api/src/infrastructure/stripe-test/https-policy.ts';
import { stripeSandboxPreflight } from '../../apps/api/src/infrastructure/stripe-test/preflight.ts';
import { validateStripeTestSecrets } from '../../apps/api/src/infrastructure/stripe-test/config.ts';

/** Only the interactive manual runner reads this file. Never export its secrets to process.env. */
export async function loadStripeTrialEnvironment(
  env: Readonly<Record<string, string | undefined>>, terminal: boolean,
  read: () => Promise<string> = () => readFile('.env.local', 'utf8'),
) {
  assertLocalStripeTerminal(env, terminal); // Must precede any file access, even in CI.
  try {
    const contents = await read();
    if (Buffer.byteLength(contents) > 65536) throw new CheckoutTestFailure('CONFIGURATION_INVALID');
    const file = parseEnv(contents);
    assertLocalStripeTerminal(file, terminal);
    const local = { ...file, ...env };
    assertLocalStripeServices(local);
    // Stripe values must come exclusively from the file; reject ambiguous environment overrides.
    if (Object.keys(env).some((key) => /^STRIPE_/i.test(key) && env[key] !== undefined))
      throw new CheckoutTestFailure('CONFIGURATION_INVALID');
    stripeSandboxPreflight(file);
    const accountId = file.STRIPE_SANDBOX_ACCOUNT_ID;
    const apiKey = file.STRIPE_SANDBOX_API_KEY;
    if (!accountId || !apiKey) throw new CheckoutTestFailure('CONFIGURATION_INVALID');
    const secrets = validateStripeTestSecrets({ apiKey,
      ...(file.STRIPE_SANDBOX_WEBHOOK_SECRET === undefined ? {} : { webhookSecret: file.STRIPE_SANDBOX_WEBHOOK_SECRET }) });
    return { accountId, secrets, databaseUrl: local.DATABASE_URL ?? '', publishableKey: local.SUPABASE_PUBLISHABLE_KEY ?? '' };
  } catch (error) {
    if (error instanceof CheckoutTestFailure) throw error;
    throw new CheckoutTestFailure('CONFIGURATION_INVALID'); // No parser/filesystem error details.
  }
}

export function assertStripeTrialAccount(accountId: string, plan: { readonly accountId: string }) {
  if (accountId !== plan.accountId) throw new CheckoutTestFailure('CONFIGURATION_INVALID');
}
