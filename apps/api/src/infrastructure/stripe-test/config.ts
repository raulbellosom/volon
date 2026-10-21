import { CheckoutTestFailure } from '../../modules/payments/checkout-sandbox.port.ts';
export const STRIPE_TEST_API_VERSION = '2026-09-30.endive';
export const testApiKeyPattern = /^(?:sk|rk)_test_[A-Za-z0-9_]{3,200}$/;
export const testPublishableKeyPattern = /^pk_test_[A-Za-z0-9_]{3,200}$/;
export const testWebhookSecretPattern = /^whsec_[A-Za-z0-9_]{3,200}$/;
export interface StripeTestSecrets { readonly apiKey: string; readonly webhookSecret?: string }
export interface StripeTestConfig {
  readonly environment: 'offline-test';
  readonly accountId: string;
  readonly returnOrigin: string;
}
export const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
export function stripeId(value: unknown, prefix: string): value is string {
  return typeof value === 'string' && value.length <= 255 && new RegExp(`^${prefix}[A-Za-z0-9_]+$`).test(value);
}
export function validateStripeTestConfig(config: StripeTestConfig) {
  if (config.environment !== 'offline-test' || !stripeId(config.accountId, 'acct_') || process.env.NODE_ENV === 'production')
    throw new CheckoutTestFailure('CONFIGURATION_INVALID');
  let url: URL;
  try { url = new URL(config.returnOrigin); } catch { throw new CheckoutTestFailure('CONFIGURATION_INVALID'); }
  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(url.hostname) || !url.port
    || url.username || url.password || url.pathname !== '/' || url.search || url.hash || url.origin !== config.returnOrigin)
    throw new CheckoutTestFailure('CONFIGURATION_INVALID');
  return Object.freeze({ ...config });
}
export function validateStripeTestSecrets(secrets: StripeTestSecrets): StripeTestSecrets {
  if (!secrets || typeof secrets.apiKey !== 'string' || !testApiKeyPattern.test(secrets.apiKey)
    || (secrets.webhookSecret !== undefined && (typeof secrets.webhookSecret !== 'string' || !testWebhookSecretPattern.test(secrets.webhookSecret))))
    throw new CheckoutTestFailure('CONFIGURATION_INVALID');
  return { apiKey: secrets.apiKey, ...(secrets.webhookSecret === undefined ? {} : { webhookSecret: secrets.webhookSecret }) };
}
