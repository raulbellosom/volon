import { randomUUID } from 'node:crypto';
import type { PrismaClient, PaymentEvidenceLabEvent } from '@prisma/client';
import { assertRuntimeRole, withSubject } from './database.ts';
import { PaymentFailure } from '../modules/payments/payment.contract.ts';
import type { EvidenceReceipt } from '../modules/payments/evidence.contract.ts';
import type { EvidenceStore } from '../modules/payments/evidence.service.ts';
import { projectEvidence } from '../modules/payments/evidence.policy.ts';

function receipt(row: PaymentEvidenceLabEvent): EvidenceReceipt {
  return { caseId: row.caseId, eventId: row.eventId, state: row.state as EvidenceReceipt['state'],
    version: row.version, disposition: row.disposition as EvidenceReceipt['disposition'],
    needsReconciliation: row.needsReconciliation, receivedAt: row.receivedAt.toISOString() };
}
export function createPaymentEvidenceStore(db: PrismaClient): EvidenceStore {
  return {
    async observe(actor, event, requestHash, origin) {
      await assertRuntimeRole(db);
      try {
        return await withSubject(db, actor, async (tx) => {
          await tx.$queryRaw`SELECT set_config('app.payment_evidence_lab', 'synthetic-v1', true)`;
          await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'payment-lab:' + event.caseId}, 0))::text`;
          const fixture = await tx.paymentEvidenceLabCase.findUnique({ where: { id: event.caseId } });
          if (!fixture) throw new PaymentFailure('NOT_FOUND');
          const duplicate = await tx.paymentEvidenceLabEvent.findUnique({ where: { eventId: event.eventId } });
          if (duplicate) {
            if (duplicate.caseId !== event.caseId || duplicate.requestHash !== requestHash) throw new PaymentFailure('IDEMPOTENCY_CONFLICT');
            return receipt(duplicate);
          }
          const latest = await tx.paymentEvidenceLabEvent.findFirst({ where: { caseId: event.caseId }, orderBy: { version: 'desc' } });
          if ((latest?.version ?? 0) !== event.expectedVersion) throw new PaymentFailure('VERSION_CONFLICT');
          const projection = projectEvidence(latest ? receipt(latest) : null, event, fixture, origin);
          return receipt(await tx.paymentEvidenceLabEvent.create({ data: {
            id: randomUUID(), caseId: event.caseId, eventId: event.eventId, requestHash, providerPaymentId: event.providerPaymentId,
            source: event.source, kind: event.kind, amountMinor: event.amountMinor, currency: event.currency,
            occurredAt: new Date(event.occurredAt), origin, ...projection, version: event.expectedVersion + 1,
          } }));
        });
      } catch (error) {
        // A globally duplicated ID in an RLS-hidden case must not reveal that case.
        if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002')
          throw new PaymentFailure('IDEMPOTENCY_CONFLICT');
        throw error;
      }
    },
  };
}
