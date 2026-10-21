import { request } from 'node:https';
import { lookup } from 'node:dns/promises';
import { CheckoutTestFailure } from '../../modules/payments/checkout-sandbox.port.ts';
import type { StripeTestTransport } from './http.ts';
import { assertLocalStripeTerminal, createStripeRequestBudget, publicStripeIpv4,
  transportDenied, snapshotStripeWireRequest } from './https-policy.ts';
import { boundedStripeHttps } from './https-wire.ts';
import { assertStripeTrialApproval, validateStripeTrialPlan, type StripeTrialPlan } from './trial-plan.ts';
import { validateStripeLocalServices, type StripeLocalServices } from './local-services.ts';

/** Never imported by app/main. No injectable endpoint, CA, proxy, resolver or networking default. */
export function createApprovedStripeTestTransport(value: StripeTrialPlan, confirmation: string,
  local: StripeLocalServices, verifyInstance: () => Promise<void>) {
  assertLocalStripeTerminal(process.env, !!process.stdin.isTTY && !!process.stdout.isTTY);
  const services = validateStripeLocalServices(local);
  if (typeof verifyInstance !== 'function') transportDenied();
  if (process.execArgv.some((a) => a !== '--experimental-strip-types')) transportDenied();
  const plan = validateStripeTrialPlan(value);
  assertStripeTrialApproval(plan, confirmation);
  const consume = createStripeRequestBudget(plan);
  let requests = 0, posts = 0;
  const transport: StripeTestTransport = async (value) => {
    // Approval and process guards are checked per request, not only at composition time.
    assertLocalStripeTerminal(process.env, !!process.stdin.isTTY && !!process.stdout.isTTY);
    validateStripeLocalServices(services);
    await verifyInstance();
    assertStripeTrialApproval(plan, confirmation);
    const message = snapshotStripeWireRequest(value);
    consume(message);
    requests++;
    if (message.method === 'POST') posts++;
    return boundedStripeHttps(message, { open: request, resolve: async () => {
      const addresses = await lookup('api.stripe.com', { all: true, family: 4 });
      if (!addresses.length || addresses.some((a) => !publicStripeIpv4(a.address)))
        throw new CheckoutTestFailure('REQUEST_UNKNOWN');
      const first = addresses[0];
      if (!first) throw new CheckoutTestFailure('REQUEST_UNKNOWN');
      return first.address;
    } });
  };
  return Object.freeze({ transport, report: () => ({ attemptedRequests: requests, attemptedPosts: posts }) });
}
