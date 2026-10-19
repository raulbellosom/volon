import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { admin, db, login, withSubject, input, request, setup, gate, authenticate } from './private-location-fixtures.ts';
import { createSyntheticLocationKeys, createSyntheticLocationLedger } from '../src/infrastructure/synthetic-location-security.adapter.ts';
import { createPrivateLocationLab } from '../src/modules/private-locations/private-location.lab.ts';
import { createPrivateLocationRepository } from '../src/infrastructure/private-location.repository.ts';
import { envelopeAad, envelopeBinding, PrivateLocationFailure, syntheticPayload } from '../src/modules/private-locations/private-location.contract.ts';
import type { EnvelopeRow } from '../src/modules/private-locations/private-location.ports.ts';

const unavailable = (error: unknown) => error instanceof PrivateLocationFailure && error.code === 'UNAVAILABLE'
  && !/postgres|kms|credential|payload/i.test(error.message);

test('private location integration: failed KMS/ledger, absent ledger and lost keys never expose a location', async () => {
  const a = await login();
  const keys = createSyntheticLocationKeys(gate);
  const ledger = createSyntheticLocationLedger(gate);
  let failKeys = false;
  let failLedger = false;
  const { lab } = setup({ keys: { ...keys, open: async (...args) => {
    if (failKeys) throw new Error('KMS credential diagnostic');
    return keys.open(...args);
  } }, ledger: { ...ledger, inspect: async (...args) => {
    if (failLedger) throw new Error('Ledger infrastructure diagnostic');
    return ledger.inspect(...args);
  } } });
  const id = (await lab.create(request(a.token), input())).locationId;
  failKeys = true;
  await assert.rejects(lab.read(request(a.token), id), unavailable);
  failKeys = false;
  failLedger = true;
  await assert.rejects(lab.read(request(a.token), id), unavailable);
  await assert.rejects(lab.retire(request(a.token), id), unavailable);
  failLedger = false;
  assert.ok(await lab.read(request(a.token), id));
  const missingLedger = setup({ keys, ledger: createSyntheticLocationLedger(gate) }).lab;
  await assert.rejects(missingLedger.read(request(a.token), id), unavailable);
  const missingKeys = setup({ keys: createSyntheticLocationKeys(gate), ledger }).lab;
  await assert.rejects(missingKeys.read(request(a.token), id), unavailable);
  const wrongBinding = setup({ keys, ledger: { ...ledger, inspect: async () => ({ binding: 'wrong', state: 'active' }) } }).lab;
  await assert.rejects(wrongBinding.read(request(a.token), id), unavailable);
  const noPolicy = createPrivateLocationLab({ gate, keys, ledger, store: createPrivateLocationRepository(db),
    policies: ['synthetic-other'], authenticate });
  await assert.rejects(noPolicy.read(request(a.token), id), unavailable);
  const hungKeys = setup({ keys: { ...keys, open: async () => new Promise<Buffer>(() => undefined) }, ledger }).lab;
  await assert.rejects(hungKeys.read(request(a.token), id), unavailable);
});

test('private location integration: malicious ciphertext persisted in PostgreSQL is rejected by GCM', async () => {
  const a = await login();
  const { keys, ledger, lab } = setup();
  const id = randomUUID();
  const context = { id, keyRef: id, subjectId: a.subjectId, merchantId: 'merchant_synthetic_a',
    branchId: 'branch_synthetic_a', requestId: randomUUID(), policyId: 'synthetic-test', version: 1,
    expiresAt: new Date(Date.now() + 60000) };
  await keys.create(id);
  const sealed = await keys.seal(id, Buffer.from(JSON.stringify(syntheticPayload('grid-a'))), envelopeAad(context));
  const ciphertext = Buffer.from(sealed.ciphertext);
  ciphertext[0] = (ciphertext[0] ?? 0) ^ 1;
  await ledger.activate(id, envelopeBinding(context));
  await withSubject(db, a, async (tx) => {
    await tx.$queryRaw`SELECT set_config('app.private_location_lab', 'synthetic-v1', true)`;
    await tx.privateLocationEnvelope.create({ data: { ...context, ...sealed, ciphertext, state: 'active' } });
  });
  await assert.rejects(lab.read(request(a.token), id), unavailable);
});

test('private location integration: failed retirement rolls back DB, but external tombstone blocks old active row with live key', async () => {
  const a = await login();
  const keys = createSyntheticLocationKeys(gate);
  let failDestroy = true;
  const { lab, ledger } = setup({ keys: { ...keys, destroy: async (id) => {
    if (failDestroy) throw new Error('KMS simulated outage');
    return keys.destroy(id);
  } } });
  const command = input();
  const id = (await lab.create(request(a.token), command)).locationId;
  const before = await admin.privateLocationEnvelope.findUniqueOrThrow({ where: { id } });
  await assert.rejects(lab.retire(request(a.token), id), unavailable);
  const restored = await admin.privateLocationEnvelope.findUniqueOrThrow({ where: { id } });
  assert.equal(restored.state, 'active', 'PostgreSQL rollback restored the pre-retirement row');
  assert.deepEqual(restored.ciphertext, before.ciphertext);
  assert.equal((await ledger.inspect(id))?.state, 'revoked');
  const stillDecryptable = await keys.open(id, before, envelopeAad(before));
  assert.ok(stillDecryptable.length > 0, 'test isolates ledger protection from key destruction');
  stillDecryptable.fill(0);
  assert.equal(await lab.read(request(a.token), id), null);
  await assert.rejects(lab.create(request(a.token), command), unavailable);
  failDestroy = false;
  assert.deepEqual(await lab.retire(request(a.token), id), { state: 'key_destroyed' });
  assert.equal(await lab.read(request(a.token), id), null);
});

test('private location integration: PostgreSQL archived row replay cannot resurrect access after retirement', async () => {
  const a = await login();
  const { lab, keys, ledger, store } = setup();
  const id = (await lab.create(request(a.token), input())).locationId;
  await admin.$transaction(async (tx) => {
    // Test-owned temporary backup of ciphertext, not a physical backup or production restore.
    await tx.$executeRaw`CREATE TEMP TABLE private_location_restore_fixture ON COMMIT DROP AS
      SELECT * FROM app."PrivateLocationEnvelope" WHERE id = ${id}::uuid`;
    await lab.retire(request(a.token), id);
    const [archived] = await tx.$queryRaw<EnvelopeRow[]>`SELECT * FROM private_location_restore_fixture`;
    assert.ok(archived);
    assert.equal(archived.state, 'active');
    const restoredStore = { transaction: <T>(actor: { subjectId: string }, lock: string,
      operation: Parameters<typeof store.transaction<T>>[2]) => store.transaction(actor, lock, (current) => operation({
      ...current, load: async (rowId) => {
        const visible = await current.load(rowId);
        return visible && rowId === archived.id ? archived : visible;
      },
    })) };
    const reader = setup({ keys, ledger, store: restoredStore }).lab;
    assert.equal(await reader.read(request(a.token), id), null);
    await assert.rejects(keys.open(id, archived, envelopeAad(archived)));
    const restarted = setup({ store: restoredStore }).lab;
    await assert.rejects(restarted.read(request(a.token), id), unavailable);
  }, { timeout: 15000 });
});

test('private location integration: synthetic expiry uses PostgreSQL clock and missing policy denies ingestion', async () => {
  const a = await login();
  const { lab, keys, ledger } = setup();
  const id = (await lab.create(request(a.token), input({ expiresAt: new Date(Date.now() + 1500).toISOString() }))).locationId;
  assert.ok(await lab.read(request(a.token), id));
  await new Promise((resolve) => setTimeout(resolve, 1600));
  assert.equal(await lab.read(request(a.token), id), null);
  await assert.rejects(lab.create(request(a.token), input({ policyId: 'unapproved' })));
  await assert.rejects(lab.create(request(a.token), input({ expiresAt: new Date(0).toISOString() })));
  assert.throws(() => createPrivateLocationLab({ gate, keys, ledger, store: createPrivateLocationRepository(db),
    policies: [], authenticate }));
  const elevated = setup({ store: createPrivateLocationRepository(admin), keys, ledger }).lab;
  await assert.rejects(elevated.read(request(a.token), id), unavailable);
});

test('private location integration: membership revocation during KMS decrypt is checked before returning plaintext', async () => {
  const a = await login();
  const keys = createSyntheticLocationKeys(gate);
  const member = await admin.membership.findFirstOrThrow({ where: { subjectId: a.subjectId, branchId: 'branch_synthetic_a' } });
  let revoke = false;
  const { lab } = setup({ keys: { ...keys, open: async (...args) => {
    const plaintext = await keys.open(...args);
    if (revoke) await admin.membership.update({ where: { id: member.id }, data: { enabled: false } });
    return plaintext;
  } } });
  const id = (await lab.create(request(a.token), input())).locationId;
  revoke = true;
  try { assert.equal(await lab.read(request(a.token), id), null); }
  finally { await admin.membership.update({ where: { id: member.id }, data: { enabled: true } }); }
});

test('private location integration: failed insert rolls back ciphertext, compensates external state and permits clean retry', async () => {
  const a = await login();
  const store = createPrivateLocationRepository(db);
  let failInsert = true;
  let provisional: EnvelopeRow | undefined;
  const wrapped = { transaction: <T>(actor: { subjectId: string }, lock: string,
    operation: Parameters<typeof store.transaction<T>>[2]) => store.transaction(actor, lock, (tx) => operation({
    ...tx, insert: async (row) => {
      provisional = row;
      await tx.insert(row);
      if (failInsert) throw new Error('Synthetic post-insert failure');
    },
  })) };
  const { lab, keys, ledger } = setup({ store: wrapped });
  const command = input();
  await assert.rejects(lab.create(request(a.token), command), unavailable);
  const failed = provisional;
  assert.ok(failed);
  assert.equal(await admin.privateLocationEnvelope.count({ where: { id: failed.id } }), 0);
  assert.equal((await ledger.inspect(failed.id))?.state, 'revoked');
  await assert.rejects(keys.open(failed.keyRef, failed, envelopeAad(failed)));
  await assert.rejects(ledger.activate(failed.id, envelopeBinding(failed)));
  failInsert = false;
  const created = await lab.create(request(a.token), command);
  assert.notEqual(created.locationId, failed.id);
  assert.ok(await lab.read(request(a.token), created.locationId));
  assert.equal(await admin.privateLocationEnvelope.count({ where: { requestId: command.requestId } }), 1);
});
