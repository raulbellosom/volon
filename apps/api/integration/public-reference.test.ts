import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { PUBLIC_REFERENCE_PATTERN, parseDeliveryResponse } from '@delivery/contracts';
import { admin, db, base, login, newQuote, createDelivery, readDelivery, required } from './delivery-fixtures.ts';
import { courierLogin, expiredCourierToken } from './courier-fixtures.ts';
import { withHistoryFixture } from './delivery-history-fixtures.ts';
import { createDeliveryRepository } from '../src/infrastructure/delivery.repository.ts';
import { createDeliveryService } from '../src/modules/deliveries/delivery.service.ts';
import { generatePublicReference } from '../src/modules/deliveries/public-reference.ts';
import { withSubject, createDatabase } from '../src/infrastructure/database.ts';
import { createDeliveryHandler } from '../src/modules/deliveries/delivery.handler.ts';
import { createSupabaseAuthenticator } from '../src/infrastructure/supabase-auth.adapter.ts';

function lookup(token: string | undefined, reference: string, query = '') {
  return fetch(`${base}/v1/deliveries/by-reference/${encodeURIComponent(reference)}${query}`, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}
async function delivery(token: string, tenant = 'a') {
  const quote = await newQuote(token, tenant);
  const response = await createDelivery(token, quote, randomUUID(), `branch_synthetic_${tenant}`);
  assert.equal(response.status, 201);
  return parseDeliveryResponse(await response.json());
}

test('public reference: parallel issuance, persistence, canonical lookup and unchanged UUID navigation/idempotency', async () => {
  const a = await login();
  const rows = await Promise.all(Array.from({ length: 8 }, () => delivery(a.token)));
  assert.equal(new Set(rows.map((row) => row.publicReference)).size, 8);
  for (const row of rows) {
    assert.match(row.publicReference, PUBLIC_REFERENCE_PATTERN);
    assert.deepEqual(await (await readDelivery(a.token, row.deliveryId)).json(), row);
    for (const input of [row.publicReference, row.publicReference.toLowerCase().replaceAll('-', ''), ` ${row.publicReference.replaceAll('-', ' ')} `]) {
      const response = await lookup(a.token, input);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.deepEqual(await response.json(), row);
    }
  }
  const quoteId = await newQuote(a.token);
  const key = randomUUID();
  const first = await (await createDelivery(a.token, quoteId, key)).json();
  assert.deepEqual(await (await createDelivery(a.token, quoteId, key)).json(), first);
  assert.equal(await admin.deliveryPublicReference.count({ where: { deliveryId: first.deliveryId } }), 1);
});

test('public reference: forced collision with hidden tenant retries without aborting PostgreSQL; exhaustion rolls back', async () => {
  const a = await login();
  const b = await login('b');
  const hidden = await delivery(b.token, 'b');
  let attempts = 0;
  const quoteId = await newQuote(a.token);
  const service = createDeliveryService(createDeliveryRepository(db, {
    newReference: (time) => ++attempts === 1 ? hidden.publicReference : generatePublicReference(time, 'AB'),
  }));
  const issuedKey = randomUUID();
  const row = await service(a, { quoteId, branchId: 'branch_synthetic_a' }, issuedKey);
  assert.equal(attempts, 2);
  assert.match(row.publicReference, /^AB-/);
  assert.notEqual(row.publicReference, hidden.publicReference);
  const quote2 = await newQuote(a.token);
  let failedAttempts = 0;
  const exhausted = createDeliveryService(createDeliveryRepository(db, { newReference: () => { failedAttempts++; return hidden.publicReference; } }));
  const key = randomUUID();
  await assert.rejects(exhausted(a, { quoteId: quote2, branchId: 'branch_synthetic_a' }, key), /exhausted/);
  assert.equal(failedAttempts, 8);
  assert.equal(await admin.delivery.count({ where: { quoteId: quote2 } }), 0);
  const retry = await createDeliveryService(createDeliveryRepository(db))(a, { quoteId: quote2, branchId: 'branch_synthetic_a' }, key);
  assert.match(retry.publicReference, /^VL-/);
  const rebranded = createDeliveryService(createDeliveryRepository(db, { prefix: 'NEW' }));
  assert.deepEqual(await rebranded(a, { quoteId, branchId: 'branch_synthetic_a' }, issuedKey), row);
});

test('public reference: Auth, RLS, sibling branch isolation, revocation and malformed queries reveal no foreign deliveries', async () => {
  const a = await login();
  const b = await login('b');
  const row = await delivery(a.token);
  const absent = generatePublicReference(new Date());
  const foreign = await lookup(b.token, row.publicReference);
  const missing = await lookup(b.token, absent);
  assert.equal(foreign.status, 404);
  assert.deepEqual(await foreign.json(), await missing.json());
  for (const token of [undefined, 'invalid.token.value', expiredCourierToken(a.subjectId)]) assert.equal((await lookup(token, row.publicReference)).status, 401);
  const courier = await courierLogin();
  assert.equal((await lookup(courier.token, row.publicReference)).status, 404);
  for (const input of ['VL-26-7K9M2', 'VL-26-123456', row.publicReference + '/extra', 'x'.repeat(33), '%ZZ'])
    assert.equal((await lookup(a.token, input)).status, 422);
  assert.equal((await lookup(a.token, row.publicReference, '?paid=true')).status, 422);
  await withSubject(db, b, async (tx) => {
    assert.equal(await tx.deliveryPublicReference.findUnique({ where: { publicReference: row.publicReference } }), null);
    assert.ok((await tx.deliveryPublicReference.findMany()).every((item) => item.deliveryId !== row.deliveryId));
  });
  await assert.rejects(withSubject(db, b, (tx) => tx.deliveryPublicReference.create({
    data: { deliveryId: row.deliveryId, publicReference: generatePublicReference(new Date()) },
  })));
  await withHistoryFixture(async ({ ids, membershipId }) => {
    const id = ids[0];
    assert.ok(id);
    const reference = await admin.deliveryPublicReference.findUniqueOrThrow({ where: { deliveryId: id } });
    await admin.membership.update({ where: { id: membershipId }, data: { enabled: false } });
    assert.equal((await lookup(a.token, reference.publicReference)).status, 404);
  });
  await admin.membership.update({ where: { id: 'membership_synthetic_a' }, data: { enabled: false } });
  try { assert.equal((await lookup(a.token, row.publicReference)).status, 404); }
  finally { await admin.membership.update({ where: { id: 'membership_synthetic_a' }, data: { enabled: true } }); }
  await admin.branch.update({ where: { id: 'branch_synthetic_a' }, data: { enabled: false } });
  try { assert.equal((await lookup(a.token, row.publicReference)).status, 404); }
  finally { await admin.branch.update({ where: { id: 'branch_synthetic_a' }, data: { enabled: true } }); }
  await admin.merchant.update({ where: { id: 'merchant_synthetic_a' }, data: { enabled: false } });
  try { assert.equal((await lookup(a.token, row.publicReference)).status, 404); }
  finally { await admin.merchant.update({ where: { id: 'merchant_synthetic_a' }, data: { enabled: true } }); }
});

test('public reference: immutable mapping, complete backfill, runtime cannot run repair or forge foreign mappings', async () => {
  const a = await login();
  const row = await delivery(a.token);
  const before = await admin.delivery.findUniqueOrThrow({ where: { id: row.deliveryId } });
  assert.ok(before.routeSnapshot !== null);
  const noMappingQuote = await newQuote(a.token);
  await assert.rejects(admin.delivery.create({ data: { ...before, id: randomUUID(), quoteId: noMappingQuote,
    idempotencyKeyHash: randomUUID().replaceAll('-', '').repeat(2), routeSnapshot: before.routeSnapshot } }));
  assert.equal(await admin.delivery.count({ where: { quoteId: noMappingQuote } }), 0);
  const [result] = await admin.$queryRaw<{ missing: number }[]>`SELECT count(*)::int AS missing FROM app."Delivery" d
    LEFT JOIN app."DeliveryPublicReference" r ON r."deliveryId" = d.id WHERE r."deliveryId" IS NULL`;
  assert.equal(result?.missing, 0);
  const [backfill] = await admin.$queryRaw<{ count: number }[]>`SELECT app.backfill_delivery_public_references('NEW') AS count`;
  assert.equal(backfill?.count, 0);
  assert.deepEqual(await admin.delivery.findUniqueOrThrow({ where: { id: row.deliveryId } }), before);
  assert.equal((await admin.deliveryPublicReference.findUniqueOrThrow({ where: { deliveryId: row.deliveryId } })).publicReference, row.publicReference);
  await assert.rejects(admin.deliveryPublicReference.update({ where: { deliveryId: row.deliveryId }, data: { publicReference: generatePublicReference(new Date()) } }));
  await assert.rejects(admin.deliveryPublicReference.delete({ where: { deliveryId: row.deliveryId } }));
  await assert.rejects(db.$queryRaw`SELECT app.backfill_delivery_public_references()`);
  await assert.rejects(withSubject(db, a, (tx) => tx.deliveryPublicReference.create({ data: { deliveryId: randomUUID(), publicReference: generatePublicReference(new Date()) } })));
  assert.equal(await db.deliveryPublicReference.count(), 0);
});

test('public reference: deferred mapping failure rolls back Delivery/quote/reference; replay after retry returns same folio', async () => {
  const a = await login();
  const quote = await newQuote(a.token);
  const key = randomUUID();
  await admin.$executeRawUnsafe(`CREATE FUNCTION app.test_reference_failure() RETURNS trigger LANGUAGE plpgsql
    AS $$ BEGIN RAISE EXCEPTION 'synthetic commit failure'; END; $$`);
  try {
    await admin.$executeRawUnsafe(`CREATE CONSTRAINT TRIGGER test_reference_failure AFTER INSERT ON app."DeliveryPublicReference"
      DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION app.test_reference_failure()`);
    try {
      const response = await createDelivery(a.token, quote, key);
      assert.equal(response.status, 503);
      assert.ok(!(await response.text()).includes('synthetic commit failure'));
      assert.equal(await admin.delivery.count({ where: { quoteId: quote } }), 0);
    } finally { await admin.$executeRawUnsafe('DROP TRIGGER test_reference_failure ON app."DeliveryPublicReference"'); }
  } finally { await admin.$executeRawUnsafe('DROP FUNCTION app.test_reference_failure()'); }
  const response = await createDelivery(a.token, quote, key);
  assert.equal(response.status, 201);
  assert.deepEqual(await (await createDelivery(a.token, quote, key)).json(), await response.json());
});

test('public reference: unavailable Auth/PostgreSQL or reference grants yield safe no-store errors', async () => {
  const a = await login();
  const row = await delivery(a.token);
  const auth = createSupabaseAuthenticator(required('SUPABASE_URL'), required('SUPABASE_PUBLISHABLE_KEY'));
  const unavailable = createDatabase('postgresql://synthetic:synthetic@127.0.0.1:1/postgres');
  const request = () => new Request(`${base}/v1/deliveries/by-reference/${row.publicReference}`,
    { headers: { authorization: `Bearer ${a.token}` } });
  try {
    const handlers = [createDeliveryHandler({ ...createDeliveryRepository(unavailable), authenticate: auth }),
      createDeliveryHandler({ ...createDeliveryRepository(db), authenticate: createSupabaseAuthenticator('http://127.0.0.1:59999', 'synthetic') })];
    for (const handler of handlers) {
      const response = await handler(request());
      assert.equal(response.status, 503);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.equal((await response.json()).code, 'SERVICE_UNAVAILABLE');
    }
  } finally { await unavailable.$disconnect(); }
  await admin.$executeRawUnsafe('REVOKE SELECT ON app."DeliveryPublicReference" FROM delivery_api');
  try { assert.equal((await lookup(a.token, row.publicReference)).status, 503); }
  finally { await admin.$executeRawUnsafe('GRANT SELECT ON app."DeliveryPublicReference" TO delivery_api'); }
});
