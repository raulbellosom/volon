import { createHash } from 'node:crypto';
import type { CourierActor } from '../couriers/courier.service.ts';
import { DispatchFailure, parseDispatchCommand, parseDispatchReceipt, validateDispatchKey,
  type DispatchReceipt, type DispatchCommand } from './dispatch.contract.ts';
import { denyFinancialEligibility, type FinancialEligibilityPort, type DispatchStore, type DispatchTransaction } from './dispatch.ports.ts';

const hash = (value: string) => createHash('sha256').update(value).digest('hex');
function eligible(port: FinancialEligibilityPort, reference: string) {
  if (port.evaluate(reference) !== 'synthetic-fixture') throw new DispatchFailure('FINANCIAL_INELIGIBLE');
}
async function change(tx: DispatchTransaction, command: Exclude<DispatchCommand, { operation: 'offer' }>,
  current: DispatchReceipt, port: FinancialEligibilityPort): Promise<DispatchReceipt> {
  if (current.version !== command.expectedVersion) throw new DispatchFailure('VERSION_CONFLICT');
  if (command.operation === 'revoke') {
    if (current.kind !== 'assignment' || current.status !== 'active') throw new DispatchFailure('STATE_CONFLICT');
    return tx.transition(current, 'revoked');
  }
  if (current.kind !== 'offer' || current.status !== 'offered') throw new DispatchFailure('STATE_CONFLICT');
  const expired = new Date(current.expiresAt).getTime() <= (await tx.clock()).getTime();
  if (command.operation === 'expire' && !expired) throw new DispatchFailure('NOT_EXPIRED');
  if (command.operation === 'accept') {
    if (expired) throw new DispatchFailure('OFFER_EXPIRED');
    eligible(port, current.syntheticDeliveryRef);
    const accepted = await tx.transition(current, 'accepted');
    await tx.event(accepted);
    return tx.assign(accepted);
  }
  return tx.transition(current, { decline: 'declined', withdraw: 'withdrawn', expire: 'expired' }[command.operation]);
}
/** Not wired to HTTP or operational composition. Default gate always denies. */
export function createDispatchLabService(store: DispatchStore, port: FinancialEligibilityPort = denyFinancialEligibility) {
  return async (actor: CourierActor, input: unknown, key: string): Promise<DispatchReceipt> => {
    const command = parseDispatchCommand(input);
    validateDispatchKey(key);
    const keyHash = hash(key);
    const requestHash = hash(JSON.stringify(command));
    return store.transaction(actor, async (tx) => {
      const initial = await tx.courier();
      if (!initial) throw new DispatchFailure('NOT_FOUND');
      const previous = await tx.previous(initial.courierId, keyHash);
      if (previous) {
        if (previous.requestHash !== requestHash) throw new DispatchFailure('IDEMPOTENCY_CONFLICT');
        return parseDispatchReceipt(previous.receipt);
      }
      const current = command.operation === 'offer' ? null : await tx.find(command.operation === 'revoke' ? 'assignment' : 'offer', command.id);
      if (command.operation !== 'offer' && !current) throw new DispatchFailure('NOT_FOUND');
      const reference = command.operation === 'offer' ? command.syntheticDeliveryRef : current?.syntheticDeliveryRef;
      if (!reference) throw new DispatchFailure('NOT_FOUND');
      await tx.lockDelivery(reference);
      const courier = await tx.courier();
      if (!courier) throw new DispatchFailure('NOT_FOUND');
      let result: DispatchReceipt;
      if (command.operation === 'offer') {
        eligible(port, command.syntheticDeliveryRef);
        if (courier.status !== 'available') throw new DispatchFailure('COURIER_UNAVAILABLE');
        result = await tx.offer(courier.courierId, command.syntheticDeliveryRef, command.ttlSeconds);
      } else {
        const latest = await tx.find(command.operation === 'revoke' ? 'assignment' : 'offer', command.id);
        if (!latest) throw new DispatchFailure('NOT_FOUND');
        if (command.operation === 'accept' && courier.status !== 'available') throw new DispatchFailure('COURIER_UNAVAILABLE');
        result = await change(tx, command, latest, port);
      }
      await tx.event(result);
      await tx.record(result, keyHash, requestHash);
      return result;
    });
  };
}
