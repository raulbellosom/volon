import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import type { EnvelopeState, LocationKeyPort, LocationLedgerPort, LocationLabGate } from '../modules/private-locations/private-location.ports.ts';
import { assertLab } from '../modules/private-locations/private-location.contract.ts';

/** Explicit simulator, ephemeral secrets. No singleton, persistence, env key or production fallback. */
export function createSyntheticLocationKeys(gate: LocationLabGate): LocationKeyPort {
  assertLab(gate);
  const keys = new Map<string, Buffer>();
  const destroyed = new Set<string>();
  const get = (id: string) => {
    assertLab(gate);
    const key = keys.get(id);
    if (!key || destroyed.has(id)) throw new Error('Key unavailable');
    return key;
  };
  return {
    kind: 'synthetic-memory-v1',
    create: async (id) => {
      assertLab(gate);
      if (destroyed.has(id)) throw new Error('Key retired');
      if (!keys.has(id)) keys.set(id, randomBytes(32));
    },
    seal: async (id, plaintext, aad) => {
      const iv = randomBytes(12);
      const cipher = createCipheriv('aes-256-gcm', get(id), iv, { authTagLength: 16 });
      cipher.setAAD(aad);
      return { iv, ciphertext: Buffer.concat([cipher.update(plaintext), cipher.final()]), tag: cipher.getAuthTag() };
    },
    open: async (id, payload, aad) => {
      if (payload.iv.length !== 12 || payload.tag.length !== 16 || payload.ciphertext.length > 4096) throw new Error('Invalid envelope');
      const decipher = createDecipheriv('aes-256-gcm', get(id), payload.iv, { authTagLength: 16 });
      decipher.setAAD(aad);
      decipher.setAuthTag(payload.tag);
      // No plaintext escapes before final() verifies the authentication tag.
      return Buffer.concat([decipher.update(payload.ciphertext), decipher.final()]);
    },
    destroy: async (id) => {
      assertLab(gate);
      destroyed.add(id);
      keys.get(id)?.fill(0);
      keys.delete(id);
    },
  };
}

export function createSyntheticLocationLedger(gate: LocationLabGate): LocationLedgerPort {
  assertLab(gate);
  const entries = new Map<string, { binding: string; state: EnvelopeState }>();
  const check = (id: string, binding: string) => {
    assertLab(gate);
    const existing = entries.get(id);
    if (existing && existing.binding !== binding) throw new Error('Ledger binding mismatch');
    return existing;
  };
  return {
    kind: 'synthetic-memory-v1',
    inspect: async (id) => { assertLab(gate); const entry = entries.get(id); return entry ? { ...entry } : null; },
    activate: async (id, binding) => {
      const existing = check(id, binding);
      if (existing && existing.state !== 'active') throw new Error('Location retired');
      entries.set(id, { binding, state: 'active' });
    },
    revoke: async (id, binding) => {
      const existing = check(id, binding);
      entries.set(id, { binding, state: existing?.state === 'key_destroyed' ? 'key_destroyed' : 'revoked' });
    },
    confirmDestroyed: async (id, binding) => {
      const existing = check(id, binding);
      if (!existing || existing.state === 'active') throw new Error('Missing revocation');
      entries.set(id, { binding, state: 'key_destroyed' });
    },
  };
}
