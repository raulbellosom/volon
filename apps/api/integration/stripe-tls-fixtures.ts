import { localTls } from '../tests/stripe-https.fixtures.ts';
import type { OfflineStripe } from '../tests/stripe-test.fixtures.ts';
import type { StripeTestTransport } from '../src/infrastructure/stripe-test/http.ts';
import { boundedStripeHttps } from '../src/infrastructure/stripe-test/https-wire.ts';
import { createStripeRequestBudget } from '../src/infrastructure/stripe-test/https-policy.ts';
import type { StripeTrialPlan } from '../src/infrastructure/stripe-test/trial-plan.ts';

/** Real TLS over loopback only; accepts a synthetic Session before optionally dropping its response. */
export async function tlsProvider(remote: OfflineStripe) {
  const behavior = { dropPost: false };
  const server = await localTls((req, res) => {
    void (async () => {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(Buffer.from(chunk));
      if (req.method !== 'POST' && req.method !== 'GET') throw new Error('Unexpected synthetic request');
      const response = await remote.transport({ url: 'https://api.stripe.com' + req.url, method: req.method,
        headers: { Authorization: String(req.headers.authorization), 'Stripe-Version': String(req.headers['stripe-version']),
          ...(req.headers['idempotency-key'] ? { 'Idempotency-Key': String(req.headers['idempotency-key']) } : {}) },
        body: req.method === 'POST' ? Buffer.concat(chunks).toString('utf8') : undefined,
        signal: new AbortController().signal, redirect: 'error' });
      if (req.method === 'POST' && behavior.dropPost) { res.destroy(); return; }
      res.writeHead(response.status, { 'content-type': 'application/json' }); res.end(response.body);
    })().catch(() => res.destroy());
  });
  return { ...server, behavior, transport: (plan: StripeTrialPlan): StripeTestTransport => {
    const consume = createStripeRequestBudget(plan);
    return (r) => { consume(r); return boundedStripeHttps(r, server.io); };
  } };
}
