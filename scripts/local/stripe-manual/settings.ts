import { existsSync } from 'node:fs';
import { randomBytes, randomUUID, createHmac } from 'node:crypto';
import { MANUAL_STRIPE_ENV_FILE, MANUAL_STRIPE_PURPOSE, manualStripeServices } from '../../../apps/api/src/infrastructure/stripe-test/local-services.ts';
import { validateStripeTestSecrets } from '../../../apps/api/src/infrastructure/stripe-test/config.ts';
import { dockerFile, provenanceFile, readPrivateEnv, envText, writePrivate, fail } from './files.ts';
import { historicalEvidence, legacySettings, assertHistoricalEvidence } from './history.ts';
import { readProvenance } from './identity.ts';

export function localJwt(secret: string, role: 'anon' | 'service_role', lifetime = 3600) {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const unsigned = encode({ alg: 'HS256', typ: 'JWT' }) + '.' + encode({ role, aud: 'authenticated', iss: 'supabase',
    iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + lifetime });
  return unsigned + '.' + createHmac('sha256', secret).update(unsigned).digest('base64url');
}
export async function initializePrivateSettings() {
  if ([MANUAL_STRIPE_ENV_FILE, dockerFile, provenanceFile].some(existsSync)) fail();
  const source = legacySettings();
  const apiKey = source.STRIPE_SANDBOX_API_KEY ?? '';
  validateStripeTestSecrets({ apiKey });
  const accountId = source.STRIPE_SANDBOX_ACCOUNT_ID ?? '';
  const instanceId = randomUUID(), adminPassword = randomBytes(32).toString('hex');
  const runtimePassword = randomBytes(32).toString('hex'), authPassword = randomBytes(32).toString('hex');
  const jwtSecret = randomBytes(48).toString('hex');
  const legacy = await historicalEvidence();
  const privateDocker = { MANUAL_INSTANCE_ID: instanceId, MANUAL_DB_PASSWORD: adminPassword,
    MANUAL_AUTH_DB_PASSWORD: authPassword, MANUAL_JWT_SECRET: jwtSecret };
  writePrivate(dockerFile, envText(privateDocker), true);
  writePrivate(provenanceFile, JSON.stringify({ version: 1, instanceId, accountId, legacy, phase: 'creating' }) + '\n', true);
  writePrivate(MANUAL_STRIPE_ENV_FILE, envText({ LOCAL_SYNTHETIC_MODE: 'true', LOCAL_ENVIRONMENT_KIND: MANUAL_STRIPE_PURPOSE,
    LOCAL_STRIPE_INSTANCE_ID: instanceId, SUPABASE_URL: 'http://127.0.0.1:57321',
    MIGRATION_DATABASE_URL: `postgresql://postgres:${adminPassword}@127.0.0.1:57322/postgres?schema=app`,
    DATABASE_URL: `postgresql://delivery_api:${runtimePassword}@127.0.0.1:57322/postgres?schema=app`,
    SUPABASE_PUBLISHABLE_KEY: localJwt(jwtSecret, 'anon', 365 * 86400), SYNTHETIC_USER_PASSWORD: randomBytes(32).toString('hex'),
    STRIPE_SANDBOX_ACCOUNT_ID: accountId, STRIPE_SANDBOX_API_KEY: apiKey,
    ...(source.STRIPE_SANDBOX_WEBHOOK_SECRET ? { STRIPE_SANDBOX_WEBHOOK_SECRET: source.STRIPE_SANDBOX_WEBHOOK_SECRET } : {}),
    ...(source.STRIPE_SANDBOX_PUBLISHABLE_KEY ? { STRIPE_SANDBOX_PUBLISHABLE_KEY: source.STRIPE_SANDBOX_PUBLISHABLE_KEY } : {}),
  }), true);
}
export function readManualSettings() {
  const file = readPrivateEnv(MANUAL_STRIPE_ENV_FILE);
  const services = manualStripeServices(file);
  const provenance = readProvenance();
  const legacy = legacySettings();
  const admin = new URL(file.MIGRATION_DATABASE_URL ?? '');
  const runtime = new URL(file.DATABASE_URL ?? '');
  if (provenance.instanceId !== services.instanceId || file.STRIPE_SANDBOX_ACCOUNT_ID !== provenance.accountId
    || provenance.accountId !== legacy.STRIPE_SANDBOX_ACCOUNT_ID || admin.protocol !== 'postgresql:'
    || admin.hostname !== '127.0.0.1' || admin.port !== '57322' || admin.pathname !== '/postgres'
    || admin.username !== 'postgres' || !/^[a-f0-9]{64}$/.test(admin.password) || admin.hash || admin.search !== '?schema=app'
    || !/^[a-f0-9]{64}$/.test(runtime.password)) fail();
  return { file, services, provenance };
}
export async function verifyHistoricalPreservation() {
  const { provenance } = readManualSettings();
  assertHistoricalEvidence(provenance.legacy, await historicalEvidence());
}
