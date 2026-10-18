import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createMerchantContextHandler } from '../src/modules/merchants/merchant-context.handler.ts';

const actor = { subjectId: '11111111-1111-4111-8111-111111111111' };
const membership = { merchant: { merchantId: 'merchant_a', name: 'Comercio sintético' },
  branch: { branchId: 'branch_a', name: 'Sucursal sintética' } };
const paths = ['/v1/me', '/v1/merchants/merchant_a/branches'] as const;
const request = (path: string, method = 'GET') => new Request(`http://local${path}`, { method });

test('merchant context HTTP: subject comes from authentication and scope from route only', async () => {
  const calls: (string | undefined)[] = [];
  const handler = createMerchantContextHandler({ authenticate: async () => actor,
    readMemberships: async (identity, merchantId) => {
      assert.deepEqual(identity, actor);
      calls.push(merchantId);
      return [membership];
    } });
  const me = await handler(request('/v1/me?subjectId=forged&merchantId=other'));
  assert.equal(me.status, 200);
  assert.deepEqual(await me.json(), { subjectId: actor.subjectId, memberships: [membership] });
  const branches = await handler(request(paths[1]));
  assert.equal(branches.status, 200);
  assert.deepEqual(await branches.json(), { merchant: membership.merchant, branches: [membership.branch] });
  assert.deepEqual(calls, [undefined, 'merchant_a']);
  for (const response of [me, branches]) {
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.match(response.headers.get('content-type') ?? '', /application\/json/);
  }
});

test('merchant context HTTP: no memberships returns empty me and uniform merchant 404', async () => {
  const handler = createMerchantContextHandler({ authenticate: async () => actor, readMemberships: async () => [] });
  assert.deepEqual(await (await handler(request(paths[0]))).json(), { subjectId: actor.subjectId, memberships: [] });
  const own = await handler(request(paths[1]));
  const other = await handler(request('/v1/merchants/nonexistent/branches'));
  assert.equal(own.status, 404);
  assert.deepEqual(await own.json(), await other.json());
  assert.equal(own.headers.get('cache-control'), 'no-store');
});

test('merchant context HTTP: rejects unauthorized calls before repository access', async () => {
  const handler = createMerchantContextHandler({ authenticate: async () => null,
    readMemberships: async () => { throw new Error('Repository must not run'); } });
  for (const path of paths) {
    const response = await handler(request(path));
    assert.equal(response.status, 401);
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }
});

test('merchant context HTTP: safe auth/database failures, no sensitive diagnostics', async () => {
  for (const failing of ['auth', 'database']) {
    const handler = createMerchantContextHandler({
      authenticate: async () => { if (failing === 'auth') throw new Error('private auth secret'); return actor; },
      readMemberships: async () => { throw new Error('postgres private connection secret'); },
    });
    for (const path of paths) {
      const response = await handler(request(path));
      assert.equal(response.status, 503);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.deepEqual(await response.json(), { type: 'about:blank', title: 'Servicio temporalmente no disponible.',
        status: 503, code: 'SERVICE_UNAVAILABLE' });
    }
  }
});

test('merchant context HTTP: invalid public DTOs fail closed without leaking stored fields', async () => {
  const handler = createMerchantContextHandler({ authenticate: async () => actor,
    readMemberships: async () => [{ ...membership, branch: { ...membership.branch, name: '' } }] });
  for (const path of paths) {
    const response = await handler(request(path));
    assert.equal(response.status, 503);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal((await response.json()).code, 'SERVICE_UNAVAILABLE');
  }
});

test('merchant context HTTP: method and malformed route errors are noncacheable', async () => {
  const handler = createMerchantContextHandler({ authenticate: async () => { throw new Error('Must not run'); },
    readMemberships: async () => [] });
  for (const path of paths) {
    const response = await handler(request(path, 'POST'));
    assert.equal(response.status, 405);
    assert.equal(response.headers.get('allow'), 'GET');
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }
  for (const id of ['invalid%20id', 'x'.repeat(129)]) {
    const response = await handler(request(`/v1/merchants/${id}/branches`));
    assert.equal(response.status, 404);
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }
});
