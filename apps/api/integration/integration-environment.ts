import { readFileSync, existsSync } from 'node:fs';
import { parseEnv } from 'node:util';

/** A configured manual sandbox must never be used as an automated integration target. */
export function assertOfflineIntegrationTarget(...sources: Readonly<Record<string, string | undefined>>[]) {
  if (sources.some((source) => source.LOCAL_ENVIRONMENT_KIND === 'manual-stripe-test-v1'
    || Object.keys(source).some((key) => /^(STRIPE_SANDBOX_|LOCAL_STRIPE_)/i.test(key))))
    throw new Error('AUTOMATED_INTEGRATION_MANUAL_STACK_BLOCKED: usa un stack desechable separado, sin configuración Stripe manual.');
}
export function loadOfflineIntegrationEnvironment() {
  let file: Record<string, string | undefined>;
  try { file = parseEnv(readFileSync('.env.local', 'utf8')); }
  catch { throw new Error('INTEGRATION_CONFIGURATION_UNAVAILABLE'); }
  if (existsSync('.env.stripe-manual.local')) throw new Error('AUTOMATED_INTEGRATION_MANUAL_STACK_BLOCKED');
  assertOfflineIntegrationTarget(process.env, file);
  process.loadEnvFile('.env.local');
}
