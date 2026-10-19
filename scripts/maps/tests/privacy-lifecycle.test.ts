import assert from 'node:assert/strict';
import test from 'node:test';
import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from 'node:crypto';

/** Test-only thought experiment for ADR-0011. No DB/worker/runtime deletion capability. */
interface Scope { readonly merchant: string; readonly branch: string }
interface Grant extends Scope { readonly active: boolean }
interface Envelope extends Scope {
  readonly id: string;
  readonly expiresAt: number;
  readonly iv: Buffer;
  readonly ciphertext: Buffer;
  readonly tag: Buffer;
}
function prototype() {
  const keys = new Map<string, Buffer>();
  const tombstones = new Set<string>();
  let ledgerAvailable = true;
  const aad = (row: Pick<Envelope, 'id' | 'merchant' | 'branch'>) =>
    Buffer.from(JSON.stringify([row.id, row.merchant, row.branch, 1]));
  return {
    create(scope: Scope, payload: string, expiresAt: number): Envelope {
      const id = randomUUID();
      const key = randomBytes(32);
      const iv = randomBytes(12);
      const cipher = createCipheriv('aes-256-gcm', key, iv);
      cipher.setAAD(aad({ id, ...scope }));
      const ciphertext = Buffer.concat([cipher.update(payload, 'utf8'), cipher.final()]);
      keys.set(id, key);
      return { id, ...scope, expiresAt, iv, ciphertext, tag: cipher.getAuthTag() };
    },
    read(row: Envelope, grant: Grant, now: number): string | null {
      if (!ledgerAvailable || tombstones.has(row.id) || !grant.active || now >= row.expiresAt
        || row.merchant !== grant.merchant || row.branch !== grant.branch) return null;
      const key = keys.get(row.id);
      if (!key) return null;
      const decipher = createDecipheriv('aes-256-gcm', key, row.iv);
      decipher.setAAD(aad(row));
      decipher.setAuthTag(row.tag);
      try { return Buffer.concat([decipher.update(row.ciphertext), decipher.final()]).toString('utf8'); }
      catch { return null; }
    },
    retire(id: string) {
      if (!ledgerAvailable) throw new Error('Ledger unavailable');
      tombstones.add(id);
      keys.get(id)?.fill(0);
      keys.delete(id);
    },
    ledgerUnavailable() { ledgerAvailable = false; },
  };
}
const a = { merchant: 'synthetic-a', branch: 'synthetic-branch-a' };
const grant = { ...a, active: true };

test('privacy proposal: cross-merchant/branch and revoked scope denied; transplanted ciphertext fails authentication', () => {
  const model = prototype();
  const row = model.create(a, 'DIRECCIÓN ARTIFICIAL NO REAL', 100);
  assert.equal(model.read(row, grant, 1), 'DIRECCIÓN ARTIFICIAL NO REAL');
  assert.equal(model.read(row, { ...grant, merchant: 'synthetic-b' }, 1), null);
  assert.equal(model.read(row, { ...grant, branch: 'sibling' }, 1), null);
  assert.equal(model.read(row, { ...grant, active: false }, 1), null);
  assert.equal(model.read({ ...row, branch: 'sibling' }, { ...grant, branch: 'sibling' }, 1), null);
  assert.equal(model.read(row, grant, 100), null);
});

test('privacy proposal: retirement idempotent, immutable business facts preserved, ciphertext backup cannot restore key', () => {
  const model = prototype();
  const row = model.create(a, 'DIRECCIÓN ARTIFICIAL NO REAL', 100);
  const other = model.create({ merchant: 'synthetic-b', branch: 'synthetic-branch-b' }, 'OTHER ARTIFICIAL', 100);
  const core = Object.freeze({ deliveryId: 'synthetic-delivery', amountMinor: 3000, privateEnvelopeId: row.id });
  const before = JSON.stringify(core);
  const backup = { ...row, ciphertext: Buffer.from(row.ciphertext) };
  assert.equal(backup.ciphertext.includes('DIRECCIÓN'), false);
  model.retire(row.id);
  model.retire(row.id);
  assert.equal(model.read(backup, grant, 1), null);
  assert.equal(JSON.stringify(core), before);
  assert.equal(model.read(other, { merchant: other.merchant, branch: other.branch, active: true }, 1), 'OTHER ARTIFICIAL');
  const restoredWithoutKeys = prototype();
  assert.equal(restoredWithoutKeys.read(backup, grant, 1), null);
});

test('privacy proposal: unknown tombstone ledger blocks all reads and retirement rather than claiming completion', () => {
  const model = prototype();
  const row = model.create(a, 'ARTIFICIAL', 100);
  model.ledgerUnavailable();
  assert.equal(model.read(row, grant, 1), null);
  assert.throws(() => model.retire(row.id));
});
