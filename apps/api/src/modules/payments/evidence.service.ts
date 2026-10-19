import { digest } from './payment.service.ts';
import { infrastructureFailure, PaymentFailure, validatePaymentActor, type PaymentActor } from './payment.contract.ts';
import { denyLabOrigin, parseLabEvidence, type LabEvidence, type LabOrigin, type LabOriginVerifier, type EvidenceReceipt } from './evidence.contract.ts';
export interface EvidenceStore {
  observe(actor: PaymentActor, event: LabEvidence, hash: string, origin: LabOrigin): Promise<EvidenceReceipt>;
}
export function createEvidenceLabService(store: EvidenceStore, verifier: LabOriginVerifier = denyLabOrigin) {
  return {
    async observe(actor: PaymentActor, input: unknown, proof: string): Promise<EvidenceReceipt> {
      validatePaymentActor(actor);
      const event = parseLabEvidence(input);
      if (typeof proof !== 'string' || proof.length > 512) throw new PaymentFailure('INVALID_COMMAND');
      try {
        const canonical = JSON.stringify(event);
        // No network or signature verification while holding database locks.
        const origin = await verifier.verify(canonical, proof);
        if (origin !== 'synthetic-fixture' && origin !== 'rejected') throw new Error('Unrecognized laboratory verifier');
        return await store.observe(actor, event, digest(JSON.stringify({ canonical, origin })), origin);
      } catch (error) { return infrastructureFailure(error); }
    },
  };
}
