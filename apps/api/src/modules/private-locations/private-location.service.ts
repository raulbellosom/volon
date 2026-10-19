import { randomUUID } from 'node:crypto';
import type { QuoteActor } from '../pricing/quote.service.ts';
import type { EnvelopeRow, LocationKeyPort, LocationLedgerPort, LocationStore, LocationTransaction } from './private-location.ports.ts';
import { decodeSynthetic, envelopeAad, envelopeBinding, keyDeadline, PrivateLocationFailure,
  syntheticPayload, type FixtureId } from './private-location.contract.ts';

export interface CreatePrivateLocation {
  readonly branchId: string;
  readonly requestId: string;
  readonly fixtureId: FixtureId;
  readonly policyId: string;
  readonly expiresAt: string;
}
export function createPrivateLocationService(deps: {
  readonly store: LocationStore; readonly keys: LocationKeyPort; readonly ledger: LocationLedgerPort;
  readonly policies: ReadonlySet<string>;
}) {
  const inspect = async (row: EnvelopeRow) => {
    const entry = await keyDeadline(() => deps.ledger.inspect(row.id));
    if (!entry || entry.binding !== envelopeBinding(row)) throw new PrivateLocationFailure('UNAVAILABLE');
    return entry.state;
  };
  const active = async (tx: LocationTransaction, row: EnvelopeRow) => {
    if (!deps.policies.has(row.policyId)) throw new PrivateLocationFailure('UNAVAILABLE');
    return row.state === 'active' && row.expiresAt.getTime() > (await tx.now()).getTime();
  };
  const decrypt = async (tx: LocationTransaction, row: EnvelopeRow) => {
    if (!await active(tx, row) || await inspect(row) !== 'active') return null;
    const plaintext = await keyDeadline(() => deps.keys.open(row.keyRef, row, envelopeAad(row)));
    try {
      const payload = decodeSynthetic(plaintext);
      const current = await tx.load(row.id);
      if (!current || !await active(tx, current) || await inspect(current) !== 'active') return null;
      return payload;
    } finally { plaintext.fill(0); }
  };
  return {
    create: async (actor: QuoteActor, input: CreatePrivateLocation) => {
      let provisional: EnvelopeRow | undefined;
      try {
        return await deps.store.transaction(actor, `${actor.subjectId}:${input.branchId}:${input.requestId}`, async (tx) => {
          const branch = await tx.branch(input.branchId);
          if (!branch) throw new PrivateLocationFailure('ACCESS_DENIED');
          const existing = await tx.findRequest(input.branchId, input.requestId);
          if (existing) {
            const payload = await decrypt(tx, existing);
            if (!payload) throw new PrivateLocationFailure('UNAVAILABLE');
            if (payload.fixtureId !== input.fixtureId || existing.policyId !== input.policyId
              || existing.expiresAt.toISOString() !== input.expiresAt) throw new PrivateLocationFailure('CONFLICT');
            return { locationId: existing.id };
          }
          const expiresAt = new Date(input.expiresAt);
          if (expiresAt.getTime() <= (await tx.now()).getTime()) throw new PrivateLocationFailure('INVALID_INPUT');
          const id = randomUUID();
          const context = { id, keyRef: id, subjectId: actor.subjectId, merchantId: branch.merchantId,
            branchId: branch.id, requestId: input.requestId, version: 1, policyId: input.policyId, expiresAt };
          // Capture context before any external operation so cleanup can install a tombstone on timeout.
          provisional = { ...context, state: 'active', iv: new Uint8Array(), tag: new Uint8Array(), ciphertext: new Uint8Array() };
          await keyDeadline(() => deps.keys.create(id));
          const plaintext = Buffer.from(JSON.stringify(syntheticPayload(input.fixtureId)));
          let sealed;
          try { sealed = await keyDeadline(() => deps.keys.seal(id, plaintext, envelopeAad(context))); }
          finally { plaintext.fill(0); }
          await keyDeadline(() => deps.ledger.activate(id, envelopeBinding(context)));
          const row: EnvelopeRow = { ...context, ...sealed, state: 'active' };
          await tx.insert(row);
          if (!await tx.branch(branch.id) || !await active(tx, row) || await inspect(row) !== 'active') {
            throw new PrivateLocationFailure('UNAVAILABLE');
          }
          return { locationId: id };
        });
      } catch (error) {
        if (provisional) {
          const row = provisional;
          // Independent attempts: either denial mechanism is useful even if its peer is unavailable.
          await Promise.allSettled([
            keyDeadline(() => deps.ledger.revoke(row.id, envelopeBinding(row))),
            keyDeadline(() => deps.keys.destroy(row.keyRef)),
          ]);
        }
        throw error;
      }
    },
    read: (actor: QuoteActor, id: string) => deps.store.transaction(actor, id, async (tx) => {
      const row = await tx.load(id);
      return row ? decrypt(tx, row) : null;
    }),
    retire: (actor: QuoteActor, id: string) => deps.store.transaction(actor, id, async (tx) => {
      const row = await tx.load(id);
      if (!row) throw new PrivateLocationFailure('ACCESS_DENIED');
      const binding = envelopeBinding(row);
      const entry = await keyDeadline(() => deps.ledger.inspect(id));
      if (!entry || entry.binding !== binding) throw new PrivateLocationFailure('UNAVAILABLE');
      await keyDeadline(() => deps.ledger.revoke(id, binding));
      await tx.transition(id, 'revoked');
      await keyDeadline(() => deps.keys.destroy(row.keyRef));
      await keyDeadline(() => deps.ledger.confirmDestroyed(id, binding));
      await tx.transition(id, 'key_destroyed');
      if (!await tx.load(id)) throw new PrivateLocationFailure('ACCESS_DENIED');
      return { state: 'key_destroyed' as const };
    }),
  };
}
