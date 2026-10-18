import assert from 'node:assert/strict';
import test from 'node:test';
import { once } from 'node:events';
import { createHttpServer } from '../src/http/server.ts';
import { readConfig } from '../src/config.ts';

test('HTTP listener: serves Fetch responses and rejects oversized bodies before invoking business logic', async () => {
  let calls = 0;
  const server = createHttpServer(async () => { calls++; return Response.json({ ok: true }); });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const url = `http://127.0.0.1:${address.port}`;
  try {
    assert.equal((await fetch(url)).status, 200);
    assert.equal(calls, 1);
    const oversized = await fetch(url, { method: 'POST', body: 'x'.repeat(16385) });
    assert.equal(oversized.status, 413);
    assert.equal((await oversized.json()).code, 'PAYLOAD_TOO_LARGE');
    assert.equal(calls, 1);
  } finally {
    await new Promise<void>((resolve) => { server.close(() => resolve()); server.closeAllConnections(); });
  }
});

test('backend config: requires explicit synthetic mode, service configuration and valid port', () => {
  const valid = { DATABASE_URL: 'postgresql://delivery_api:synthetic@127.0.0.1:56322/postgres',
    SUPABASE_URL: 'http://127.0.0.1:56321', SUPABASE_PUBLISHABLE_KEY: 'synthetic', LOCAL_SYNTHETIC_MODE: 'true' };
  assert.equal(readConfig(valid).port, 3100);
  assert.throws(() => readConfig({ ...valid, LOCAL_SYNTHETIC_MODE: 'false' }));
  assert.throws(() => readConfig({ ...valid, PORT: '0' }));
  assert.throws(() => readConfig({ ...valid, DATABASE_URL: '' }));
});
