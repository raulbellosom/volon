import assert from 'node:assert/strict';
import test from 'node:test';
import { createDeliveryHandler, type DeliveryHttpDependencies } from '../src/modules/deliveries/delivery.handler.ts';

function handler(overrides: Partial<DeliveryHttpDependencies> = {}) {
  return createDeliveryHandler({ authenticate: async () => ({ subjectId: 'synthetic' }),
    transaction: async () => { throw new Error('private database detail'); },
    readDelivery: async () => null, ...overrides });
}
const request = (body: string, type = 'application/json') => new Request('https://synthetic.invalid/v1/deliveries', {
  method: 'POST', headers: { 'content-type': type, 'idempotency-key': 'synthetic-key' }, body,
});

test('Delivery HTTP: authenticates before reading or creating and hides inaccessible resources', async () => {
  assert.equal((await handler({ authenticate: async () => null })(request('{}'))).status, 401);
  const response = await handler()(new Request('https://synthetic.invalid/v1/deliveries/missing'));
  assert.equal(response.status, 404);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('Delivery HTTP: validates method, media type and JSON before calling persistence', async () => {
  assert.equal((await handler()(request('{'))).status, 400);
  assert.equal((await handler()(request('{}', 'text/plain'))).status, 415);
  assert.equal((await handler()(request('{}'))).status, 422);
  const method = await handler()(new Request('https://synthetic.invalid/v1/deliveries'));
  assert.equal(method.status, 405);
  assert.equal(method.headers.get('allow'), 'GET, POST');
});

test('Delivery HTTP: never reports success or leaks details after transaction failure', async () => {
  const response = await handler()(request(JSON.stringify({ branchId: 'branch_test', quoteId: 'quote_test' })));
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('content-type'), 'application/problem+json');
  assert.ok(!(await response.text()).includes('private database detail'));
});
