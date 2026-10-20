import assert from 'node:assert/strict';
import { test, beforeEach, afterEach, mock } from 'node:test';
import { boundedStripeHttps } from '../src/infrastructure/stripe-test/https-wire.ts';
import { localTls, tlsFixture, wireRequest } from './stripe-https.fixtures.ts';
beforeEach(() => { mock.method(globalThis, 'fetch', () => { throw new Error('External fetch forbidden'); }); });
afterEach(() => mock.restoreAll());

test('HTTPS pump uses validated TLS identity, no agent/proxy/redirect and exact bounded request', async () => {
  const server = await localTls((req, res) => {
    assert.equal(req.headers.host, 'api.stripe.com');
    assert.equal(req.headers['accept-encoding'], 'identity');
    res.writeHead(200, { 'content-type': 'application/json' }); res.end('{"object":"account","id":"acct_offline"}');
  });
  try {
    const result = await boundedStripeHttps(wireRequest(), server.io);
    assert.equal(result.status, 200); assert.equal(server.count(), 1);
    assert.equal(server.seen[0]?.rejectUnauthorized, true);
    assert.equal(server.seen[0]?.servername, 'api.stripe.com');
    assert.equal(server.seen[0]?.minVersion, 'TLSv1.2'); assert.equal(server.seen[0]?.agent, false);
    assert.equal(server.seen[0]?.maxHeaderSize, 8192);
  } finally { await server.close(); }
});

test('untrusted certificate and valid certificate for a different host fail without leaking TLS details', async () => {
  for (const [fixture, trust] of [[tlsFixture(), false], [tlsFixture('other.example.test'), true]] as const) {
    const server = await localTls((_req, res) => res.end(), fixture, trust);
    try { await assert.rejects(boundedStripeHttps(wireRequest(), server.io), { message: 'REQUEST_UNKNOWN' });
      assert.equal(server.count(), 0);
    } finally { await server.close(); }
  }
});

test('request headers/body are snapshotted before DNS await; mutation cannot switch to Live or alter the submitted body', async () => {
  const server = await localTls((req, res) => {
    assert.equal(req.headers.authorization, 'Bearer sk_test_offline_fixture');
    assert.equal(req.method, 'GET'); assert.equal(req.url, '/v1/account');
    res.writeHead(200, { 'content-type': 'application/json' }); res.end('{}');
  });
  let release = () => {};
  const delayed = new Promise<void>((r) => { release = r; });
  const value = wireRequest();
  try {
    const result = boundedStripeHttps(value, { ...server.io, resolve: async () => { await delayed; return '127.0.0.1'; } });
    Object.assign(value.headers, { Authorization: 'Bearer sk_live_synthetic_forbidden' });
    Object.assign(value, { method: 'POST', url: 'https://evil.test', body: 'forged' });
    release(); assert.equal((await result).status, 200);
  } finally { release(); await server.close(); }
});

test('redirects and provider error bodies never get followed or returned', async () => {
  for (const status of [302, 307, 400, 429, 500]) {
    const server = await localTls((_req, res) => {
      res.writeHead(status, { location: 'https://private.example.test/credential', 'content-type': 'text/plain' });
      res.end('sensitive provider body');
    });
    try {
      const response = await boundedStripeHttps(wireRequest(), server.io);
      assert.equal(response.status, status); assert.equal(response.body.length, 0); assert.equal(server.count(), 1);
    } finally { await server.close(); }
  }
});

test('stream and announced size, compression, header and content-type limits fail closed', async () => {
  const handlers = [
    (_req: unknown, res: import('node:http').ServerResponse) => { res.writeHead(200, { 'content-type': 'application/json' }); res.end(Buffer.alloc(262145)); },
    (_req: unknown, res: import('node:http').ServerResponse) => { res.writeHead(200, { 'content-type': 'application/json', 'content-length': '9999999' }); res.flushHeaders(); },
    (_req: unknown, res: import('node:http').ServerResponse) => { res.writeHead(200, { 'content-type': 'application/json', 'content-encoding': 'gzip' }); res.end('bad'); },
    (_req: unknown, res: import('node:http').ServerResponse) => { res.writeHead(200, { 'content-type': 'text/html' }); res.end('bad'); },
    (_req: unknown, res: import('node:http').ServerResponse) => { res.writeHead(200, { 'content-type': 'application/json', 'x-big': 'x'.repeat(9000) }); res.end('{}'); },
  ];
  for (const handler of handlers) {
    const server = await localTls(handler);
    try { await assert.rejects(boundedStripeHttps(wireRequest(), server.io), (e: unknown) =>
      e instanceof Error && ['RESPONSE_MISMATCH','REQUEST_UNKNOWN'].includes(e.message)); }
    finally { await server.close(); }
  }
});

test('total deadlines cover DNS, pre-abort, cancellation and a slow streaming response', async () => {
  let opened = 0;
  const server = await localTls((_req, res) => { res.writeHead(200, { 'content-type': 'application/json' }); res.write('{'); });
  try {
    const io = { ...server.io, resolve: async () => { opened++; return new Promise<string>(() => {}); } };
    await assert.rejects(boundedStripeHttps(wireRequest(), io, 10), { code: 'REQUEST_UNKNOWN' });
    assert.equal(opened, 1); assert.equal(server.count(), 0);
    await assert.rejects(boundedStripeHttps(wireRequest({ signal: AbortSignal.abort() }), server.io), { code: 'REQUEST_UNKNOWN' });
    assert.equal(server.count(), 0);
    const controller = new AbortController();
    const result = boundedStripeHttps(wireRequest({ signal: controller.signal }), server.io);
    setTimeout(() => controller.abort(), 30);
    await assert.rejects(result, { code: 'REQUEST_UNKNOWN' });
    await assert.rejects(boundedStripeHttps(wireRequest(), server.io, 30), { code: 'REQUEST_UNKNOWN' });
  } finally { await server.close(); }
});
