import assert from 'node:assert/strict';
import { randomUUID, randomBytes, createHmac, timingSafeEqual } from 'node:crypto';
import { admin, db, login, required, newQuote, createDelivery } from './delivery-fixtures.ts';
import { withSubject } from '../src/infrastructure/database.ts';
import { createSupabaseAuthenticator } from '../src/infrastructure/supabase-auth.adapter.ts';
import { createPaymentStore } from '../src/infrastructure/payment.repository.ts';
import { createPaymentEvidenceStore } from '../src/infrastructure/payment-evidence.repository.ts';
import { createPaymentService } from '../src/modules/payments/payment.service.ts';
import { createEvidenceLabService } from '../src/modules/payments/evidence.service.ts';
import { parseLabEvidence, type LabEvidence, type LabOriginVerifier } from '../src/modules/payments/evidence.contract.ts';
import type { PaymentActor } from '../src/modules/payments/payment.contract.ts';
export { admin, db, login, required, withSubject };

assert.equal(process.env.LOCAL_SYNTHETIC_MODE, 'true');
for (const [key, port] of [['SUPABASE_URL', '56321'], ['DATABASE_URL', '56322'], ['MIGRATION_DATABASE_URL', '56322'], ['API_URL', '3100']]) {
  assert.ok(key && port);
  const url = new URL(required(key));
  assert.equal(url.hostname, '127.0.0.1');
  assert.equal(url.port, port);
}
export const authenticate = createSupabaseAuthenticator(required('SUPABASE_URL'), required('SUPABASE_PUBLISHABLE_KEY'));
export async function identity(tenant = 'a') {
  const credentials = await login(tenant);
  const actor = await authenticate(new Request('http://localhost/lab', { headers: { authorization: `Bearer ${credentials.token}` } }));
  assert.ok(actor);
  return { ...actor, token: credentials.token };
}
export async function delivery(tenant = 'a') {
  const actor = await identity(tenant);
  const response = await createDelivery(actor.token, await newQuote(actor.token, tenant), randomUUID(), `branch_synthetic_${tenant}`);
  assert.equal(response.status, 201);
  const result = await response.json();
  return { actor, id: result.deliveryId as string, amountMinor: result.pricing.amountMinor as number };
}
export const payments = createPaymentService(createPaymentStore(db));
export const evidenceStore = createPaymentEvidenceStore(db);
/** Test-only cryptography, ephemeral key, no environment selector or PSP assertion. */
const key = randomBytes(32);
export const verifier: LabOriginVerifier = { verify: async (canonical, proof) => {
  if (!/^[0-9a-f]{64}$/.test(proof)) return 'rejected';
  const expected = createHmac('sha256', key).update(canonical).digest();
  return timingSafeEqual(expected, Buffer.from(proof, 'hex')) ? 'synthetic-fixture' : 'rejected';
} };
export function sign(event: LabEvidence) { return createHmac('sha256', key).update(JSON.stringify(parseLabEvidence(event))).digest('hex'); }
export const evidence = createEvidenceLabService(evidenceStore, verifier);
export async function fixture(tenant = 'a') {
  const source = await delivery(tenant);
  const row = await admin.paymentEvidenceLabCase.create({ data: { id: randomUUID(),
    merchantId: `merchant_synthetic_${tenant}`, branchId: `branch_synthetic_${tenant}`,
    expectedAmountMinor: source.amountMinor, currency: 'MXN', providerPaymentId: 'fixture_' + randomUUID(),
  } });
  const event: LabEvidence = { caseId: row.id, eventId: 'fixture_' + randomUUID(), providerPaymentId: row.providerPaymentId,
    source: 'synthetic_webhook', kind: 'pending', amountMinor: row.expectedAmountMinor, currency: row.currency,
    occurredAt: new Date().toISOString(), expectedVersion: 0 };
  return { ...source, event };
}
export async function observe(actor: PaymentActor, event: LabEvidence) { return evidence.observe(actor, event, sign(event)); }
export const nextEvent = (event: LabEvidence, version: number, patch: Partial<LabEvidence> = {}): LabEvidence =>
  ({ ...event, eventId: 'fixture_' + randomUUID(), expectedVersion: version, ...patch });
