import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { parseEnv } from 'node:util';
import { assertLocalStripeTerminal } from '../../apps/api/src/infrastructure/stripe-test/https-policy.ts';
import { RecoveryFailure } from '../../apps/api/src/infrastructure/stripe-test/recovery-contract.ts';
import { uuid } from '../../apps/api/src/modules/payments/payment.contract.ts';

export function parseRecoveryLabEnvironment(file: Readonly<Record<string,string|undefined>>) {
  try {
    const db = new URL(file.DATABASE_URL ?? '');
    if (file.LOCAL_ENVIRONMENT_KIND !== 'disposable-recovery-v1' || file.LOCAL_SYNTHETIC_MODE !== 'true'
      || !uuid.test(file.RECOVERY_LAB_INSTANCE_ID ?? '') || file.SUPABASE_URL !== 'http://127.0.0.1:56321'
      || db.protocol !== 'postgresql:' || db.hostname !== '127.0.0.1' || db.port !== '56322' || db.username !== 'delivery_api'
      || !db.password || db.pathname !== '/postgres' || db.search !== '?schema=app' || db.hash
      || !file.SUPABASE_PUBLISHABLE_KEY || !file.SYNTHETIC_USER_PASSWORD
      || Object.keys(file).some((key) => /^(STRIPE_|LOCAL_STRIPE_|MIGRATION_DATABASE_URL$)/i.test(key))) throw new Error();
    assertLocalStripeTerminal(file,true);
    return { instanceId: file.RECOVERY_LAB_INSTANCE_ID!, databaseUrl: file.DATABASE_URL!,
      publishableKey: file.SUPABASE_PUBLISHABLE_KEY, password: file.SYNTHETIC_USER_PASSWORD };
  } catch { throw new RecoveryFailure('RECOVERY_ENVIRONMENT_BLOCKED'); }
}
export function loadRecoveryLabEnvironment(env: Readonly<Record<string,string|undefined>>, terminal: boolean) {
  try { assertLocalStripeTerminal(env,terminal); }
  catch { throw new RecoveryFailure('RECOVERY_ENVIRONMENT_BLOCKED'); }
  if (existsSync('.env.stripe-manual.local') || Object.keys(env).some((key) => /^(STRIPE_|LOCAL_STRIPE_|DATABASE_URL$|MIGRATION_DATABASE_URL$|SUPABASE_URL$)/i.test(key)))
    throw new RecoveryFailure('RECOVERY_ENVIRONMENT_BLOCKED');
  try {
    execFileSync('git',['check-ignore','--quiet','--','.env.stripe-recovery.local'],{stdio:'ignore'});
    const bytes = readFileSync('.env.stripe-recovery.local','utf8');
    if (Buffer.byteLength(bytes) > 16384) throw new Error();
    return parseRecoveryLabEnvironment(parseEnv(bytes));
  } catch { throw new RecoveryFailure('RECOVERY_ENVIRONMENT_BLOCKED'); }
}
