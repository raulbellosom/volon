import assert from 'node:assert/strict';
import { test } from 'node:test';
import { admin, base, db, login, required, readDelivery } from './delivery-fixtures.ts';
import { historyPage, readPage, withHistoryFixture } from './delivery-history-fixtures.ts';
import { createDatabase, withSubject } from '../src/infrastructure/database.ts';
import { createDeliveryHistoryRepository } from '../src/infrastructure/delivery-history.repository.ts';
import { createDeliveryHistoryHandler } from '../src/modules/deliveries/delivery-history.handler.ts';
import { createSupabaseAuthenticator } from '../src/infrastructure/supabase-auth.adapter.ts';
import { encodeDeliveryHistoryCursor } from '../src/modules/deliveries/delivery-history.cursor.ts';

test('history integration: stable descending keyset pages, timestamp ties, replay and concurrent new head', async () => {
  await withHistoryFixture(async ({ token, branchId, ids, insert }) => {
    const first = await readPage(token, branchId, 2);
    assert.deepEqual(first.items.map((row) => row.deliveryId), ids.slice(0, 2));
    assert.ok(first.nextCursor);
    const newest = await insert('new', '2026-10-18T00:00:00.124Z');
    const second = await readPage(token, branchId, 2, first.nextCursor);
    assert.deepEqual(second.items.map((row) => row.deliveryId), ids.slice(2, 4));
    assert.deepEqual(await readPage(token, branchId, 2, first.nextCursor), second);
    assert.ok(second.nextCursor);
    const third = await readPage(token, branchId, 2, second.nextCursor);
    assert.deepEqual(third.items.map((row) => row.deliveryId), ids.slice(4));
    assert.equal(third.nextCursor, null);
    const combined = [...first.items, ...second.items, ...third.items];
    assert.equal(new Set(combined.map((row) => row.deliveryId)).size, 5);
    for (const item of combined) {
      const individual = await readDelivery(token, item.deliveryId);
      assert.equal(individual.status, 200);
      assert.deepEqual(await individual.json(), item, 'History uses exactly the public detail DTO');
    }
    assert.equal((await readPage(token, branchId, 1)).items[0]?.deliveryId, newest);
    assert.equal((await readPage(token, branchId)).items.length, 6);
    const full = await readPage(token, branchId, 6);
    assert.equal(full.nextCursor, null, 'Exactly full final pages have no continuation');
    let cursor: string | undefined;
    let pages = 0;
    const seen: string[] = [];
    do {
      pages += 1;
      assert.ok(pages <= 7, 'Pagination must terminate');
      const page = await readPage(token, branchId, 1, cursor);
      seen.push(...page.items.map((row) => row.deliveryId));
      assert.equal(new Set(seen).size, seen.length, 'No page may repeat a delivery');
      cursor = page.nextCursor ?? undefined;
    } while (cursor);
    assert.deepEqual(seen, [newest, ...ids]);
  });
});

test('history integration: visible empty branches, exhausted cursors and maximum page size', async () => {
  await withHistoryFixture(async ({ token, branchId }) => {
    assert.deepEqual(await readPage(token, branchId, 100), { items: [], nextCursor: null });
  }, 'a', false);
  await withHistoryFixture(async ({ token, branchId }) => {
    const first = await readPage(token, branchId, 2);
    assert.ok(first.nextCursor);
    const later = await readPage(token, branchId, 100, first.nextCursor);
    assert.equal(later.items.length, 3);
    assert.equal(later.nextCursor, null);
    const last = later.items.at(-1);
    assert.ok(last);
    const cursor = encodeDeliveryHistoryCursor(branchId, { createdAt: last.createdAt, deliveryId: last.deliveryId });
    assert.deepEqual(await readPage(token, branchId, 100, cursor), { items: [], nextCursor: null });
  });
});

test('history integration: default size 20 and maximum 100 use one extra row without exposing it', async () => {
  await withHistoryFixture(async ({ token, branchId, insert }) => {
    const ids: string[] = [];
    for (let index = 0; index < 101; index += 1) {
      ids.unshift(await insert(String(index).padStart(3, '0'), '2026-10-18T00:00:00.123Z'));
    }
    const initial = await readPage(token, branchId);
    assert.equal(initial.items.length, 20);
    assert.deepEqual(initial.items.map((row) => row.deliveryId), ids.slice(0, 20));
    const maximum = await readPage(token, branchId, 100);
    assert.equal(maximum.items.length, 100);
    assert.ok(maximum.nextCursor);
    const last = await readPage(token, branchId, 100, maximum.nextCursor);
    assert.deepEqual(last.items.map((row) => row.deliveryId), ids.slice(100));
    assert.equal(last.nextCursor, null);
  }, 'a', false);
});

test('history integration: cross-tenant/sibling reads hide resources and cursors never grant scope', async () => {
  await withHistoryFixture(async (a) => {
    const b = await login('b');
    const denied = await historyPage(b.token, a.branchId);
    const missing = await historyPage(b.token, 'nonexistent');
    assert.equal(denied.status, 404);
    assert.deepEqual(await denied.json(), await missing.json());
    assert.equal((await historyPage(a.token, 'branch_synthetic_b')).status, 404);
    await withHistoryFixture(async (sibling) => {
      assert.equal((await historyPage(a.token, sibling.branchId)).status, 404);
      const first = await readPage(a.token, a.branchId, 1);
      assert.ok(first.nextCursor);
      assert.equal((await historyPage(a.token, sibling.branchId, 1, first.nextCursor)).status, 422);
      assert.equal((await historyPage(b.token, a.branchId, 1, first.nextCursor)).status, 404);
    }, 'b');
    const direct = await withSubject(db, b, (tx) => tx.delivery.findMany());
    assert.ok(direct.every((row) => row.branchId !== a.branchId), 'Delivery RLS protects unfiltered queries');
    assert.deepEqual(await db.delivery.findMany(), [], 'Subject never leaks outside its transaction');
  });
});

test('history integration: next page rechecks revoked membership and enabled branch/merchant', async () => {
  await withHistoryFixture(async ({ token, branchId, membershipId }) => {
    const first = await readPage(token, branchId, 1);
    assert.ok(first.nextCursor);
    for (const kind of ['membership', 'branch', 'merchant'] as const) {
      const setEnabled = (enabled: boolean) => {
        switch (kind) {
          case 'membership': return admin.membership.update({ where: { id: membershipId }, data: { enabled } });
          case 'branch': return admin.branch.update({ where: { id: branchId }, data: { enabled } });
          case 'merchant': return admin.merchant.update({ where: { id: 'merchant_synthetic_a' }, data: { enabled } });
        }
      };
      await setEnabled(false);
      try {
        const denied = await historyPage(token, branchId, 1, first.nextCursor);
        assert.equal(denied.status, 404);
        assert.equal(denied.headers.get('cache-control'), 'no-store');
        assert.deepEqual(await denied.json(), { type: 'about:blank', title: 'Recurso no encontrado.', status: 404, code: 'NOT_FOUND' });
      } finally { await setEnabled(true); }
      assert.equal((await readPage(token, branchId, 1, first.nextCursor)).items.length, 1);
    }
  });
});

test('history integration: authenticates before rejecting invalid bounded queries and exposes collection methods', async () => {
  const a = await login();
  for (const token of [null, 'invalid-token']) {
    const response = await fetch(`${base}/v1/deliveries?limit=101`, {
      headers: token ? { authorization: `Bearer ${token}` } : {},
    });
    assert.equal(response.status, 401);
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }
  for (const query of ['', 'branchId=a&branchId=b', 'branchId=a&limit=0', 'branchId=a&limit=101',
    'branchId=a&cursor=', 'branchId=a&cursor=bad', 'branchId=a&status=requested', 'branchId=a&limit=1e2']) {
    const response = await fetch(`${base}/v1/deliveries?${query}`, { headers: { authorization: `Bearer ${a.token}` } });
    assert.equal(response.status, 422);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal((await response.json()).code, 'INVALID_DELIVERY_HISTORY_QUERY');
  }
  const response = await fetch(`${base}/v1/deliveries`, { method: 'PATCH' });
  assert.equal(response.status, 405);
  assert.equal(response.headers.get('allow'), 'GET, POST');
});

test('history integration: database read rejection and unavailable Auth/PostgreSQL fail safely', async () => {
  await withHistoryFixture(async ({ token, branchId }) => {
    await admin.$executeRaw`REVOKE SELECT ON app."Delivery" FROM delivery_api`;
    try {
      const response = await historyPage(token, branchId);
      assert.equal(response.status, 503);
      assert.deepEqual(await response.json(), { type: 'about:blank', title: 'Servicio temporalmente no disponible.',
        status: 503, code: 'SERVICE_UNAVAILABLE' });
    } finally { await admin.$executeRaw`GRANT SELECT ON app."Delivery" TO delivery_api`; }
    const unavailableUrl = new URL(required('DATABASE_URL'));
    unavailableUrl.port = '1';
    const unavailable = createDatabase(unavailableUrl.href);
    try {
      const key = required('SUPABASE_PUBLISHABLE_KEY');
      for (const [database, url] of [[unavailable, required('SUPABASE_URL')], [db, 'http://127.0.0.1:59999']] as const) {
        const handler = createDeliveryHistoryHandler({ ...createDeliveryHistoryRepository(database),
          authenticate: createSupabaseAuthenticator(url, key) });
        const response = await handler(new Request(`${base}/v1/deliveries?branchId=${branchId}`, {
          headers: { authorization: `Bearer ${token}` },
        }));
        assert.equal(response.status, 503);
        assert.equal(response.headers.get('cache-control'), 'no-store');
        assert.deepEqual(await response.json(), { type: 'about:blank', title: 'Servicio temporalmente no disponible.',
          status: 503, code: 'SERVICE_UNAVAILABLE' });
      }
    } finally { await unavailable.$disconnect(); }
  });
});
