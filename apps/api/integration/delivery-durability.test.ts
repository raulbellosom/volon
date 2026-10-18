import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { setTimeout } from 'node:timers/promises';
import { admin, base, login, newQuote, createDelivery } from './delivery-fixtures.ts';

test('Delivery durability: a real API container restart preserves idempotency and the original response', async () => {
  const a = await login();
  const quoteId = await newQuote(a.token);
  const key = randomUUID();
  const first = await createDelivery(a.token, quoteId, key);
  assert.equal(first.status, 201);
  const snapshot = await first.json();
  execFileSync('docker', ['restart', 'delivery-backend-local-api-1'], { stdio: 'pipe', timeout: 20000 });
  const deadline = Date.now() + 15000;
  let healthy = false;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${base}/health`, { signal: AbortSignal.timeout(1000) });
      await response.arrayBuffer();
      if (response.ok) { healthy = true; break; }
    } catch { /* Startup window after the actual container restart. */ }
    await setTimeout(100);
  }
  assert.equal(healthy, true, 'API must recover after restarting its process');
  const replay = await createDelivery(a.token, quoteId, key);
  assert.equal(replay.status, 201);
  assert.deepEqual(await replay.json(), snapshot);
  assert.equal(await admin.delivery.count({ where: { quoteId } }), 1);
});
