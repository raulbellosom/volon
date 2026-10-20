import { isIP } from 'node:net';
import { CheckoutTestFailure } from '../../modules/payments/checkout-sandbox.port.ts';
import { STRIPE_TEST_API_VERSION, testApiKeyPattern } from './config.ts';
import { stripeSessionKey, stripeSessionParameters } from './checkout-parameters.ts';
import type { StripeTestRequest } from './http.ts';

export interface StripeHttpsScope {
  readonly operation: 'create' | 'reconcile';
  readonly scenarioId: string;
  readonly accountId: string;
  readonly sessionId: string | null;
  readonly paymentId: string | null;
  readonly chargeId: string | null;
}
export const STRIPE_TRIAL_RETURN_ORIGIN = 'http://127.0.0.1:5173';
export function transportDenied(): never { throw new CheckoutTestFailure('TRANSPORT_DISABLED'); }
export function snapshotStripeWireRequest(value: StripeTestRequest): StripeTestRequest {
  try {
    const copy = Object.freeze({ url: value.url, method: value.method, headers: Object.freeze({ ...value.headers }),
      body: value.body, signal: value.signal, redirect: value.redirect });
    validateStripeWireRequest(copy);
    return copy;
  } catch { return transportDenied(); }
}
/** Explicitly reject unattended/cloud and environment-based network/TLS overrides. No enabling env flag. */
export function assertLocalStripeTerminal(env: Readonly<Record<string, string | undefined>>, terminal: boolean) {
  if (!terminal || env.NODE_ENV === 'production') transportDenied();
  const forbidden = /^(CI|GITHUB_ACTIONS|GITLAB_CI|TF_BUILD|VERCEL|NETLIFY|CODESPACES|CODEX_CLOUD|AWS_EXECUTION_ENV|AWS_LAMBDA_FUNCTION_NAME|K_SERVICE|WEBSITE_INSTANCE_ID|FLY_APP_NAME|RENDER|RAILWAY_ENVIRONMENT_ID|NODE_OPTIONS|NODE_TLS_REJECT_UNAUTHORIZED|NODE_EXTRA_CA_CERTS|NODE_USE_ENV_PROXY|SSL_CERT_FILE|SSL_CERT_DIR|OPENSSL_CONF|HTTP_PROXY|HTTPS_PROXY|ALL_PROXY)$/i;
  if (Object.keys(env).some((key) => forbidden.test(key) && env[key] !== undefined)) transportDenied();
}
export function assertLocalStripeServices(env: Readonly<Record<string, string | undefined>>) {
  try {
    const auth = new URL(env.SUPABASE_URL ?? '');
    const db = new URL(env.DATABASE_URL ?? '');
    if (env.LOCAL_SYNTHETIC_MODE !== 'true' || auth.href !== 'http://127.0.0.1:56321/'
      || db.protocol !== 'postgresql:' || db.hostname !== '127.0.0.1' || db.port !== '56322'
      || db.pathname !== '/postgres' || db.username !== 'delivery_api' || !db.password || db.hash
      || db.searchParams.get('schema') !== 'app' || [...db.searchParams.keys()].some((k) => k !== 'schema')) transportDenied();
  } catch { transportDenied(); }
}
export function publicStripeIpv4(address: string): boolean {
  if (isIP(address) !== 4) return false;
  const [a = 0, b = 0, c = 0] = address.split('.').map(Number);
  return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && (b === 168 || (b === 0 && (c === 0 || c === 2)) || (b === 88 && c === 99)))
    || (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) || (a === 203 && b === 0 && c === 113));
}
/** Validate again at the socket boundary, independently of StripeTestHttp. */
export function validateStripeWireRequest(r: StripeTestRequest): string {
  if (typeof r.url !== 'string' || r.url.length > 512) transportDenied();
  let url: URL;
  try { url = new URL(r.url); } catch { return transportDenied(); }
  if (url.origin !== 'https://api.stripe.com' || url.href !== r.url || url.port || url.search || url.hash || url.username || url.password
    || r.redirect !== 'error' || !(r.signal instanceof AbortSignal)) transportDenied();
  const post = r.method === 'POST';
  if ((post && url.pathname !== '/v1/checkout/sessions') || (!post && (r.method !== 'GET'
    || !/^\/v1\/(account|checkout\/sessions\/cs_test_[A-Za-z0-9_]+|payment_intents\/pi_[A-Za-z0-9_]+|charges\/ch_[A-Za-z0-9_]+)$/.test(url.pathname)))) transportDenied();
  const allowed = post ? ['Authorization','Stripe-Version','Content-Type','Idempotency-Key'] : ['Authorization','Stripe-Version'];
  if (Object.keys(r.headers).length !== allowed.length || allowed.some((k) => !Object.hasOwn(r.headers, k) || typeof r.headers[k] !== 'string')
    || !testApiKeyPattern.test(r.headers.Authorization?.slice('Bearer '.length) ?? '')
    || !r.headers.Authorization?.startsWith('Bearer ') || r.headers['Stripe-Version'] !== STRIPE_TEST_API_VERSION
    || (post && (r.headers['Content-Type'] !== 'application/x-www-form-urlencoded'
      || !/^stripe-test-session-[0-9a-f]{64}$/.test(r.headers['Idempotency-Key'] ?? '')
      || typeof r.body !== 'string' || Buffer.byteLength(r.body) > 16384)) || (!post && r.body !== undefined)) transportDenied();
  return url.pathname;
}
export function createStripeRequestBudget(scope: StripeHttpsScope) {
  let requests = 0;
  let posts = 0;
  return (request: StripeTestRequest) => {
    const path = validateStripeWireRequest(request);
    if (request.signal.aborted) throw new CheckoutTestFailure('REQUEST_UNKNOWN');
    if (scope.operation === 'create') {
      if (path !== '/v1/account' && path !== '/v1/checkout/sessions') transportDenied();
      if (request.method === 'GET' && requests !== 0) transportDenied();
      if (request.method === 'POST' && (posts || requests !== 1
        || request.body !== stripeSessionParameters(scope.scenarioId, 4400, STRIPE_TRIAL_RETURN_ORIGIN).toString()
        || request.headers['Idempotency-Key'] !== stripeSessionKey(scope.accountId, scope.scenarioId))) transportDenied();
    } else {
      if (request.method !== 'GET' || !scope.sessionId) transportDenied();
      if ((requests === 0 && path !== '/v1/account')
        || (requests === 1 && path !== '/v1/checkout/sessions/' + scope.sessionId)
        || (requests === 2 && !path.startsWith('/v1/payment_intents/'))
        || (requests === 3 && !path.startsWith('/v1/charges/'))) transportDenied();
      if (path.startsWith('/v1/checkout/sessions/') && path !== '/v1/checkout/sessions/' + scope.sessionId) transportDenied();
      if (scope.paymentId && path.startsWith('/v1/payment_intents/') && path !== '/v1/payment_intents/' + scope.paymentId) transportDenied();
      if (scope.chargeId && path.startsWith('/v1/charges/') && path !== '/v1/charges/' + scope.chargeId) transportDenied();
    }
    if (requests >= (scope.operation === 'create' ? 2 : 4)) transportDenied();
    requests++;
    if (request.method === 'POST') posts++;
  };
}
