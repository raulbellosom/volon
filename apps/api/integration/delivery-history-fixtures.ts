import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { parseDeliveryHistoryResponse, type DeliveryHistoryResponse } from '@delivery/contracts';
import { admin, base, login } from './delivery-fixtures.ts';

export async function historyPage(token: string, branchId: string, limit?: number, cursor?: string) {
  const query = new URLSearchParams({ branchId });
  if (limit !== undefined) query.set('limit', String(limit));
  if (cursor !== undefined) query.set('cursor', cursor);
  return fetch(`${base}/v1/deliveries?${query}`, { headers: { authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10000) });
}

export async function readPage(token: string, branchId: string, limit?: number, cursor?: string): Promise<DeliveryHistoryResponse> {
  const response = await historyPage(token, branchId, limit, cursor);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  return parseDeliveryHistoryResponse(await response.json());
}

export async function withHistoryFixture<T>(operation: (fixture: {
  token: string; subjectId: string; branchId: string; membershipId: string; ids: readonly string[];
  insert: (tail: string, timestamp: string) => Promise<string>;
}) => Promise<T>, tenant = 'a', populate = true): Promise<T> {
  const identity = await login(tenant);
  const suffix = randomUUID();
  const branchId = `history_branch_${suffix}`;
  const membershipId = `history_member_${suffix}`;
  // Same merchant permits testing that membership in one branch never grants its siblings.
  const merchantId = 'merchant_synthetic_a';
  await admin.branch.create({ data: { id: branchId, merchantId,
    name: 'Historial sintético', latitude: 0, longitude: 0 } });
  await admin.membership.create({ data: { id: membershipId, branchId, merchantId, subjectId: identity.subjectId } });
  const insert = async (tail: string, timestamp: string) => {
    const id = `history_${suffix}_${tail}`;
    const quoteId = `quote_${suffix}_${tail}`;
    const route = { branchId, pickup: { lat: 0, lng: 0 }, dropoff: { lat: 0.01, lng: 0.01 }, serviceType: 'local_delivery' };
    const price = { amountMinor: 100, baseAmountMinor: 100, distanceAmountMinor: 0, currency: 'MXN', rateVersion: 'synthetic-history-v1' };
    await admin.$transaction(async (tx) => {
      await tx.pricingQuote.create({ data: { id: quoteId, branchId, merchantId, subjectId: identity.subjectId,
        ...price, request: route, expiresAt: new Date('2099-01-01T00:00:00.000Z') } });
      await tx.delivery.create({ data: { id, quoteId, branchId, merchantId, subjectId: identity.subjectId,
        ...price, routeSnapshot: route, idempotencyKeyHash: randomUUID().replaceAll('-', '').repeat(2),
        requestHash: 'a'.repeat(64), createdAt: new Date(timestamp) } });
    });
    return id;
  };
  try {
    if (populate) {
      // Deliberately insert out of order, including ties and mixed-case IDs (C collation).
      for (const [tail, ms] of [['a', '123'], ['c', '121'], ['z', '123'], ['m', '122'], ['Z', '123']] as const) {
        await insert(tail, `2026-10-18T00:00:00.${ms}Z`);
      }
    }
    const ids = populate ? ['z', 'a', 'Z', 'm', 'c'].map((tail) => `history_${suffix}_${tail}`) : [];
    return await operation({ ...identity, branchId, membershipId, ids, insert });
  } finally {
    // Delivery is immutable: retain only UUID-scoped synthetic data, disable test access.
    await admin.membership.update({ where: { id: membershipId }, data: { enabled: false } });
    await admin.branch.update({ where: { id: branchId }, data: { enabled: false } });
  }
}
