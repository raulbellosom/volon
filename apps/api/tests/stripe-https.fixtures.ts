import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { createServer, request, type RequestOptions, type ServerOptions } from 'node:https';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Duplex } from 'node:stream';
import { randomUUID } from 'node:crypto';
import { STRIPE_TEST_API_VERSION } from '../src/infrastructure/stripe-test/config.ts';
import { validateStripeTrialPlan } from '../src/infrastructure/stripe-test/trial-plan.ts';
import type { StripeTestRequest } from '../src/infrastructure/stripe-test/http.ts';
import type { StripeTlsIo } from '../src/infrastructure/stripe-test/https-wire.ts';

/** Disposable self-signed TLS identity; never a Stripe key or persistent repository fixture. */
export function tlsFixture(name = 'api.stripe.com'): ServerOptions & { cert: Buffer } {
  const folder = mkdtempSync(join(tmpdir(), 'stripe-https-'));
  try {
    const command = process.platform === 'win32' ? 'C:/Program Files/Git/usr/bin/openssl.exe' : 'openssl';
    execFileSync(command, ['req','-x509','-newkey','ec','-pkeyopt','ec_paramgen_curve:P-256','-nodes','-days','1',
      '-subj','/CN=' + name,'-addext','subjectAltName=DNS:' + name,'-keyout',join(folder,'key.pem'),'-out',join(folder,'cert.pem')],
    { stdio: 'ignore', timeout: 10000 });
    return { key: readFileSync(join(folder,'key.pem')), cert: readFileSync(join(folder,'cert.pem')) };
  } finally {
    if (!resolve(folder).startsWith(resolve(tmpdir()) + sep + 'stripe-https-')) throw new Error('Unexpected TLS fixture path');
    rmSync(folder, { recursive: true, force: true });
  }
}
export const trialPlan = (operation: 'create' | 'reconcile' = 'create') => validateStripeTrialPlan({ version: 1,
  purpose: 'stripe-test-session-proposal', revision: 'a'.repeat(40), subjectId: randomUUID(),
  branchId: 'branch_synthetic_a', merchantId: 'merchant_synthetic_a', scenarioId: randomUUID(), accountId: 'acct_offline',
  amountMinor: 4400, currency: 'MXN', returnOrigin: 'http://127.0.0.1:5173', operation,
  sessionId: operation === 'reconcile' ? 'cs_test_offline' : null, paymentId: null, chargeId: null,
  expiresAt: new Date(Date.now() + 60000).toISOString(), maxRequests: operation === 'create' ? 2 : 4,
  maxSessions: operation === 'create' ? 1 : 0 });
export const wireRequest = (patch: Partial<StripeTestRequest> = {}): StripeTestRequest => ({ url: 'https://api.stripe.com/v1/account',
  method: 'GET', headers: { Authorization: 'Bearer sk_test_offline_fixture', 'Stripe-Version': STRIPE_TEST_API_VERSION },
  signal: new AbortController().signal, redirect: 'error', body: undefined, ...patch });
export async function localTls(handler: (req: IncomingMessage, res: ServerResponse) => void,
  fixture = tlsFixture(), trust = true) {
  let requests = 0;
  const sockets = new Set<Duplex>();
  const server = createServer({ ...fixture, minVersion: 'TLSv1.2' }, (req, res) => { requests++; handler(req, res); });
  server.on('connection', (socket) => { sockets.add(socket); socket.once('close', () => sockets.delete(socket)); });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const port = (server.address() as AddressInfo).port;
  const seen: RequestOptions[] = [];
  const open = ((options: RequestOptions, callback: (r: IncomingMessage) => void) => {
    seen.push(options);
    return request({ ...options, hostname: '127.0.0.1', port, ...(trust ? { ca: fixture.cert } : {}) }, callback);
  }) as typeof request;
  const io: StripeTlsIo = { resolve: async () => '127.0.0.1', open };
  return { io, seen, count: () => requests, close: async () => {
    for (const s of sockets) s.destroy();
    await new Promise<void>((r) => server.close(() => r()));
  } };
}
