import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { assertLocalStripeTerminal } from '../../apps/api/src/infrastructure/stripe-test/https-policy.ts';

export class StripeFixtureFailure extends Error {
  readonly code: 'CONFIGURATION_INVALID' | 'AUTHORIZATION_DENIED' | 'HISTORY_BLOCKED'
    | 'SCENARIO_CONFLICT' | 'INFRASTRUCTURE_UNAVAILABLE' | 'INVALID_COMMAND';
  constructor(code: StripeFixtureFailure['code']) { super(code); this.code = code; }
}

export function stripeFixtureMode(args: readonly string[]): 'dry-run' | 'create' {
  if (args.length === 1 && args[0] === '--dry-run') return 'dry-run';
  if (args.length === 1 && args[0] === '--create') return 'create';
  throw new StripeFixtureFailure('INVALID_COMMAND');
}

export function parseStripeFixtureEnvironment(contents: string) {
  try {
    if (Buffer.byteLength(contents) > 65536) throw new Error();
    const file = parseEnv(contents);
    // Reuse unattended/cloud/TLS guards, without requiring a TTY: this command never authorizes Stripe.
    assertLocalStripeTerminal(file, true);
    const accountId = file.STRIPE_SANDBOX_ACCOUNT_ID;
    const databaseUrl = file.MIGRATION_DATABASE_URL;
    if (file.LOCAL_SYNTHETIC_MODE !== 'true' || file.SUPABASE_URL !== 'http://127.0.0.1:56321'
      || !accountId || !/^acct_[A-Za-z0-9_]{1,100}$/.test(accountId) || !databaseUrl) throw new Error();
    const db = new URL(databaseUrl);
    if (db.protocol !== 'postgresql:' || db.hostname !== '127.0.0.1' || db.port !== '56322'
      || db.pathname !== '/postgres' || db.username !== 'postgres' || !db.password || db.hash
      || db.searchParams.get('schema') !== 'app' || [...db.searchParams.keys()].some((key) => key !== 'schema')
      || db.searchParams.getAll('schema').length !== 1) throw new Error();
    // Only these two values leave the parser. Never access/validate/export the Stripe API key.
    return { accountId, databaseUrl };
  } catch { throw new StripeFixtureFailure('CONFIGURATION_INVALID'); }
}

export async function loadStripeFixtureEnvironment(env: Readonly<Record<string, string | undefined>>,
  read: () => Promise<string> = () => readFile('.env.local', 'utf8'),
  ignored: () => void = () => { execFileSync('git', ['check-ignore', '--quiet', '--', '.env.local'], { stdio: 'ignore' }); },
) {
  try {
    assertLocalStripeTerminal(env, true); // Before opening the file. No process.loadEnvFile.
    if (['STRIPE_SANDBOX_ACCOUNT_ID', 'MIGRATION_DATABASE_URL', 'SUPABASE_URL', 'LOCAL_SYNTHETIC_MODE']
      .some((key) => env[key] !== undefined)) throw new Error();
    ignored(); // Tracked or non-ignored file fails closed, before reading its contents.
    return parseStripeFixtureEnvironment(await read());
  } catch { throw new StripeFixtureFailure('CONFIGURATION_INVALID'); }
}
