import { CheckoutTestFailure } from '../../modules/payments/checkout-sandbox.port.ts';

export const MANUAL_STRIPE_PURPOSE = 'manual-stripe-test-v1';
export const MANUAL_STRIPE_ENV_FILE = '.env.stripe-manual.local';
export interface StripeLocalServices {
  readonly purpose: typeof MANUAL_STRIPE_PURPOSE;
  readonly instanceId: string;
  readonly authOrigin: 'http://127.0.0.1:57321';
  readonly databasePort: '57322';
}

export function manualStripeServices(env: Readonly<Record<string, string | undefined>>): StripeLocalServices {
  try {
    const db = new URL(env.DATABASE_URL ?? '');
    if (env.LOCAL_SYNTHETIC_MODE !== 'true' || env.LOCAL_ENVIRONMENT_KIND !== MANUAL_STRIPE_PURPOSE
      || env.SUPABASE_URL !== 'http://127.0.0.1:57321'
      || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(env.LOCAL_STRIPE_INSTANCE_ID ?? '')
      || db.protocol !== 'postgresql:' || db.hostname !== '127.0.0.1' || db.port !== '57322'
      || db.username !== 'delivery_api' || !db.password || db.pathname !== '/postgres' || db.hash
      || db.search !== '?schema=app') throw new Error();
    return Object.freeze({ purpose: MANUAL_STRIPE_PURPOSE, instanceId: env.LOCAL_STRIPE_INSTANCE_ID ?? '',
      authOrigin: 'http://127.0.0.1:57321', databasePort: '57322' });
  } catch { throw new CheckoutTestFailure('CONFIGURATION_INVALID'); }
}

export function validateStripeLocalServices(value: StripeLocalServices): StripeLocalServices {
  return manualStripeServices({ LOCAL_SYNTHETIC_MODE: 'true', LOCAL_ENVIRONMENT_KIND: value.purpose,
    LOCAL_STRIPE_INSTANCE_ID: value.instanceId, SUPABASE_URL: value.authOrigin,
    DATABASE_URL: `postgresql://delivery_api:validation@127.0.0.1:${value.databasePort}/postgres?schema=app` });
}
