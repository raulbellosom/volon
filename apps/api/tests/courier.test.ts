import assert from 'node:assert/strict';
import test from 'node:test';
import type { CourierMeResponse } from '@delivery/contracts';
import { createCourierAvailabilityService, CourierFailure, type CourierStore,
  type CourierTransaction } from '../src/modules/couriers/courier.service.ts';
import { createCourierHandler } from '../src/modules/couriers/courier.handler.ts';

const actor = { subjectId: 'verified-subject' };
const dto: CourierMeResponse = { courierId: 'synthetic', availability: {
  status: 'offline', version: 1, changedAt: '2026-10-19T00:00:00.000Z' } };
function store(overrides: Partial<CourierTransaction> = {}): CourierStore {
  return { read: async () => dto, transaction: async (_actor, work) => work({
    read: async () => dto, findCommand: async () => null,
    update: async () => { throw new Error('Unexpected mutation'); },
    record: async () => { throw new Error('Unexpected command'); }, ...overrides,
  }) };
}
test('courier command: authorization before replay, no mutation on stale version or conflicting key', async () => {
  for (const [repository, expected] of [
    [store({ read: async () => null, findCommand: async () => { throw new Error('Unauthorized ledger read'); } }), 'NOT_FOUND'],
    [store(), 'VERSION_CONFLICT'],
    [store({ findCommand: async () => ({ requestHash: 'different', response: dto }) }), 'IDEMPOTENCY_CONFLICT'],
  ] as const) {
    await assert.rejects(createCourierAvailabilityService(repository)(actor, { status: 'available', expectedVersion: 2 }, 'key'),
      (error: unknown) => error instanceof CourierFailure && error.code === expected);
  }
});
test('courier command: commit receipt uses returned database timestamp; retries return original response', async () => {
  let saved: { requestHash: string; response: CourierMeResponse } | null = null;
  let updates = 0;
  const updated: CourierMeResponse = { ...dto, availability: { status: 'available', version: 2,
    changedAt: '2026-10-19T01:23:45.000Z' } };
  const service = createCourierAvailabilityService(store({ findCommand: async () => saved,
    update: async () => { updates++; return updated; },
    record: async (response, hash, requestHash) => { assert.match(hash, /^[0-9a-f]{64}$/); saved = { response, requestHash }; },
  }));
  const request = { status: 'available' as const, expectedVersion: 1 };
  assert.deepEqual(await service(actor, request, 'raw-key'), updated);
  assert.deepEqual(await service(actor, request, 'raw-key'), updated);
  assert.equal(updates, 1);
});
test('courier handler: safe auth/infrastructure errors, strict commands, output validation and no-store', async () => {
  const invoke = (body?: unknown) => new Request('http://local/v1/couriers/me' + (body === undefined ? '' : '/availability'),
    body === undefined ? {} : { method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': 'synthetic' },
      body: JSON.stringify(body) });
  const handler = createCourierHandler({ ...store(), authenticate: async () => actor });
  const ok = await handler(invoke());
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await ok.json(), dto);
  assert.equal((await handler(invoke({ status: 'busy', expectedVersion: 1 }))).status, 422);
  assert.equal((await handler(new Request('http://local/v1/couriers/me?subjectId=other'))).status, 422);
  for (const authenticate of [async () => null, async () => { throw new Error('secret auth diagnostic'); }]) {
    const result = await createCourierHandler({ ...store(), authenticate })(invoke());
    assert.ok([401, 503].includes(result.status));
    assert.equal(result.headers.get('content-type'), 'application/problem+json');
    assert.doesNotMatch(await result.text(), /secret auth diagnostic/);
  }
  const corrupt = await createCourierHandler({ ...store(), read: async () => ({ ...dto, courierId: '' }),
    authenticate: async () => actor })(invoke());
  assert.equal(corrupt.status, 503);
});
