import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { createSyntheticLocationKeys, createSyntheticLocationLedger } from '../src/infrastructure/synthetic-location-security.adapter.ts';
import { assertLab, decodeSynthetic, envelopeAad, envelopeBinding, syntheticPayload } from '../src/modules/private-locations/private-location.contract.ts';
import { createPrivateLocationLab } from '../src/modules/private-locations/private-location.lab.ts';

const gate = { environment: 'test' as const, enabled: true, syntheticOnly: true };
const context = () => ({ id: randomUUID(), subjectId: randomUUID(), merchantId: 'synthetic-merchant',
  branchId: 'synthetic-branch', requestId: randomUUID(), version: 1, policyId: 'synthetic-test',
  expiresAt: new Date('2099-01-01T00:00:00.000Z'), keyRef: randomUUID() });

test('private location crypto: AES-GCM round trip, unique IV, tag/ciphertext corruption and every AAD scope field', async () => {
  const keys = createSyntheticLocationKeys(gate);
  const row = context();
  await keys.create(row.keyRef);
  const plaintext = Buffer.from(JSON.stringify(syntheticPayload('grid-a')));
  const sealed = await keys.seal(row.keyRef, plaintext, envelopeAad(row));
  const second = await keys.seal(row.keyRef, plaintext, envelopeAad(row));
  assert.notDeepEqual(sealed.iv, second.iv);
  assert.equal(Buffer.from(sealed.ciphertext).includes('CALLE'), false);
  assert.deepEqual(decodeSynthetic(await keys.open(row.keyRef, sealed, envelopeAad(row))), syntheticPayload('grid-a'));
  for (const field of ['iv', 'tag', 'ciphertext'] as const) {
    const corrupted = Buffer.from(sealed[field]);
    corrupted[0] = (corrupted[0] ?? 0) ^ 1;
    await assert.rejects(keys.open(row.keyRef, { ...sealed, [field]: corrupted }, envelopeAad(row)));
  }
  for (const changed of [{ merchantId: 'other' }, { branchId: 'other' }, { id: randomUUID() },
    { subjectId: randomUUID() }, { requestId: randomUUID() }, { version: 2 }, { policyId: 'synthetic-other' },
    { expiresAt: new Date(0) }, { keyRef: randomUUID() }]) {
    await assert.rejects(keys.open(row.keyRef, sealed, envelopeAad({ ...row, ...changed })));
  }
  await keys.destroy(row.keyRef);
  await keys.destroy(row.keyRef);
  await assert.rejects(keys.open(row.keyRef, sealed, envelopeAad(row)));
  await assert.rejects(keys.create(row.keyRef));
});

test('private location ledger: absent records deny, tombstone before delayed activation, binding immutable', async () => {
  const ledger = createSyntheticLocationLedger(gate);
  const row = context();
  assert.equal(await ledger.inspect(row.id), null);
  await ledger.revoke(row.id, envelopeBinding(row));
  await assert.rejects(ledger.activate(row.id, envelopeBinding(row)));
  await ledger.confirmDestroyed(row.id, envelopeBinding(row));
  await ledger.revoke(row.id, envelopeBinding(row));
  assert.equal((await ledger.inspect(row.id))?.state, 'key_destroyed');
  await assert.rejects(ledger.revoke(row.id, 'wrong-binding'));
  assert.equal(await createSyntheticLocationLedger(gate).inspect(row.id), null);
});

test('private location gates: production, disabled mode, absent synthetic flag and arbitrary plaintext rejected', () => {
  assert.throws(() => assertLab({ ...gate, enabled: false }));
  assert.throws(() => createSyntheticLocationKeys({ ...gate, syntheticOnly: false }));
  const before = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = 'production';
    assert.throws(() => createSyntheticLocationLedger(gate));
  } finally {
    if (before === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = before;
  }
  assert.throws(() => decodeSynthetic(Buffer.from('{"addressLine":"arbitrary"}')));
  assert.throws(() => decodeSynthetic(Buffer.from(JSON.stringify({ ...syntheticPayload('grid-a'), verified: true }))));
  assert.throws(() => createPrivateLocationLab({ gate,
    keys: { ...createSyntheticLocationKeys(gate), kind: 'external-kms' }, ledger: createSyntheticLocationLedger(gate),
    store: { transaction: async () => { throw new Error('Must not run'); } },
    policies: ['synthetic-test'], authenticate: async () => null,
  }));
});
