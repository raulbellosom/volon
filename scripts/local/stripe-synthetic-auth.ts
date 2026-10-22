import { createSupabaseAuthenticator } from '../../apps/api/src/infrastructure/supabase-auth.adapter.ts';
import { CheckoutTestFailure } from '../../apps/api/src/modules/payments/checkout-sandbox.port.ts';
import { validateStripeLocalServices, type StripeLocalServices } from '../../apps/api/src/infrastructure/stripe-test/local-services.ts';

interface SyntheticLogin {
  readonly services: StripeLocalServices;
  readonly publishableKey: string;
  readonly syntheticPassword: string;
}

/** Local password grant only. Tokens never leave this scope; no refresh/storage or provider transport. */
export async function authenticateStripeSyntheticUser(local: SyntheticLogin, expectedSubjectId?: string) {
  const services = validateStripeLocalServices(local.services);
  return authenticateLocalSyntheticUser(services.authOrigin,local.publishableKey,local.syntheticPassword,expectedSubjectId);
}
/** Shared local-only password grant. The manual Stripe wrapper still requires its own strict profile. */
export async function authenticateLocalSyntheticUser(origin: string, publishableKey: string, syntheticPassword: string, expectedSubjectId?: string) {
  if (!['http://127.0.0.1:56321','http://127.0.0.1:57321'].includes(origin)) throw new CheckoutTestFailure('CONFIGURATION_INVALID');
  const local = { publishableKey, syntheticPassword };
  if (!local.publishableKey || !local.syntheticPassword || local.syntheticPassword.length > 1024)
    throw new CheckoutTestFailure('CONFIGURATION_INVALID');
  try {
    const response = await fetch(origin + '/auth/v1/token?grant_type=password', {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(5000),
      headers: { 'content-type': 'application/json', apikey: local.publishableKey },
      body: JSON.stringify({ email: 'merchant-a@example.test', password: local.syntheticPassword }),
    });
    if ([400, 401, 403].includes(response.status)) throw new CheckoutTestFailure('NOT_FOUND');
    if (!response.ok) throw new CheckoutTestFailure('INFRASTRUCTURE_UNAVAILABLE');
    const session: unknown = await response.json();
    if (!session || typeof session !== 'object' || !('access_token' in session)
      || typeof session.access_token !== 'string' || !/^[A-Za-z0-9._-]{1,8185}$/.test(session.access_token)
      || !('token_type' in session) || session.token_type !== 'bearer'
      || !('user' in session) || !session.user || typeof session.user !== 'object'
      || !('email' in session.user) || session.user.email !== 'merchant-a@example.test'
      || !('id' in session.user) || typeof session.user.id !== 'string') throw new CheckoutTestFailure('NOT_FOUND');
    const authenticate = createSupabaseAuthenticator(origin, local.publishableKey);
    const actor = await authenticate(new Request('http://127.0.0.1/stripe-trial', {
      headers: { authorization: 'Bearer ' + session.access_token },
    }));
    if (!actor || actor.subjectId !== session.user.id || (expectedSubjectId !== undefined && actor.subjectId !== expectedSubjectId))
      throw new CheckoutTestFailure('NOT_FOUND');
    return actor;
  } catch (error) {
    if (error instanceof CheckoutTestFailure) throw error;
    throw new CheckoutTestFailure('INFRASTRUCTURE_UNAVAILABLE');
  }
}
