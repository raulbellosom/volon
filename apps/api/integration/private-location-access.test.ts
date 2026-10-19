import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { admin, db, login, withSubject, input, request, setup, labRows } from './private-location-fixtures.ts';
import { syntheticPayload, PrivateLocationFailure } from '../src/modules/private-locations/private-location.contract.ts';

test('private location integration: real Auth, opaque reference, ciphertext-only PostgreSQL and concurrent replay', async () => {
  const a = await login();
  const { lab } = setup();
  const command = input();
  const references = await Promise.all(Array.from({ length: 4 }, () => lab.create(request(a.token), command)));
  for (const reference of references) assert.deepEqual(reference, references[0]);
  const reference = references[0];
  assert.ok(reference);
  assert.deepEqual(await lab.read(request(a.token), reference.locationId), syntheticPayload('grid-a'));
  const stored = await admin.privateLocationEnvelope.findUniqueOrThrow({ where: { id: reference.locationId } });
  assert.equal(Buffer.from(stored.ciphertext).includes('CALLE'), false);
  assert.equal(stored.state, 'active');
  assert.equal(stored.iv.length, 12);
  assert.equal(stored.tag.length, 16);
  assert.equal(stored.keyRef, stored.id);
  assert.equal(await admin.privateLocationEnvelope.count({ where: { requestId: command.requestId } }), 1);
  await assert.rejects(lab.create(request(a.token), { ...command, fixtureId: 'grid-b' }),
    (e: unknown) => e instanceof PrivateLocationFailure && e.code === 'CONFLICT');
  for (const token of ['', 'invalid.token']) await assert.rejects(lab.read(request(token), stored.id),
    (e: unknown) => e instanceof PrivateLocationFailure && e.code === 'UNAUTHENTICATED');
  await withSubject(db, a, async (tx) => {
    assert.equal(await tx.privateLocationEnvelope.count({ where: { id: stored.id } }), 0, 'lab GUC absent denies even own ciphertext');
  });
});

test('private location integration: direct RLS denies other merchant, unassigned sibling and forged subject/scope', async () => {
  const a = await login();
  const b = await login('b');
  const { lab } = setup();
  const id = (await lab.create(request(a.token), input())).locationId;
  assert.equal(await lab.read(request(b.token), id), null);
  await assert.rejects(lab.retire(request(b.token), id));
  assert.equal((await labRows(b)).some((row) => row.id === id), false);
  const original = await admin.privateLocationEnvelope.findUniqueOrThrow({ where: { id } });
  await withSubject(db, b, async (tx) => {
    await tx.$queryRaw`SELECT set_config('app.private_location_lab', 'synthetic-v1', true)`;
    const forged = randomUUID();
    await assert.rejects(tx.privateLocationEnvelope.create({ data: {
      ...original, id: forged, keyRef: forged, requestId: randomUUID(), subjectId: b.subjectId,
    } }));
  });
  const sibling = `private_location_sibling_${randomUUID()}`;
  await admin.branch.create({ data: { id: sibling, merchantId: original.merchantId,
    name: 'Synthetic isolated sibling', latitude: 0, longitude: 0 } });
  try {
    await assert.rejects(lab.create(request(a.token), input({ branchId: sibling })),
      (e: unknown) => e instanceof PrivateLocationFailure && e.code === 'ACCESS_DENIED');
    // Forge a scoped row into sibling with migration credentials only, then prove runtime RLS.
    const siblingId = randomUUID();
    await admin.privateLocationEnvelope.create({ data: { ...original, id: siblingId, keyRef: siblingId,
      branchId: sibling, requestId: randomUUID() } });
    assert.equal((await labRows(a)).some((row) => row.id === siblingId), false);
    assert.equal(await lab.read(request(a.token), siblingId), null);
  } finally { await admin.branch.update({ where: { id: sibling }, data: { enabled: false } }); }
});

test('private location integration: revocation and disabled merchant/branch immediately deny reads and replay', async () => {
  const a = await login();
  const { lab } = setup();
  const command = input();
  const id = (await lab.create(request(a.token), command)).locationId;
  const branch = await admin.branch.findUniqueOrThrow({ where: { id: command.branchId } });
  const member = await admin.membership.findFirstOrThrow({ where: { branchId: branch.id, subjectId: a.subjectId } });
  for (const scope of ['membership', 'branch', 'merchant']) {
    const change = async (enabled: boolean) => {
      if (scope === 'membership') await admin.membership.update({ where: { id: member.id }, data: { enabled } });
      if (scope === 'branch') await admin.branch.update({ where: { id: branch.id }, data: { enabled } });
      if (scope === 'merchant') await admin.merchant.update({ where: { id: branch.merchantId }, data: { enabled } });
    };
    await change(false);
    try {
      assert.equal(await lab.read(request(a.token), id), null);
      assert.equal((await labRows(a)).some((row) => row.id === id), false);
      await assert.rejects(lab.create(request(a.token), command));
      await assert.rejects(lab.retire(request(a.token), id));
    } finally { await change(true); }
  }
});

test('private location integration: immutable payload/scope and monotonic retirement in PostgreSQL', async () => {
  const a = await login();
  const { lab, ledger } = setup();
  const id = (await lab.create(request(a.token), input())).locationId;
  await assert.rejects(admin.privateLocationEnvelope.update({ where: { id }, data: { ciphertext: Buffer.from('malicious') } }));
  await assert.rejects(admin.privateLocationEnvelope.update({ where: { id }, data: { expiresAt: new Date('2099-01-01') } }));
  await assert.rejects(admin.privateLocationEnvelope.delete({ where: { id } }));
  assert.deepEqual(await lab.retire(request(a.token), id), { state: 'key_destroyed' });
  assert.deepEqual(await lab.retire(request(a.token), id), { state: 'key_destroyed' });
  assert.equal(await lab.read(request(a.token), id), null);
  assert.equal((await ledger.inspect(id))?.state, 'key_destroyed');
  const row = await admin.privateLocationEnvelope.findUniqueOrThrow({ where: { id } });
  assert.equal(row.state, 'key_destroyed');
  assert.ok(row.revokedAt && row.keyDestroyedAt);
  await assert.rejects(admin.privateLocationEnvelope.update({ where: { id }, data: {
    state: 'active', revokedAt: null, keyDestroyedAt: null,
  } }));
});
