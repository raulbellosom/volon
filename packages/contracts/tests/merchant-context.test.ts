import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { parseMeResponse, parseMerchantBranchesResponse, InvalidMerchantContext } from '../src/index.ts';

const subjectId = '11111111-1111-4111-8111-111111111111';
const merchant = { merchantId: 'merchant_a', name: 'Comercio sintético' };
const branch = { branchId: 'branch_a', name: 'Sucursal sintética' };
const membership = { merchant, branch };

test('merchant context: minimal immutable DTOs support empty and multiple memberships', () => {
  assert.deepEqual(parseMeResponse({ subjectId, memberships: [] }), { subjectId, memberships: [] });
  const source = { subjectId, memberships: [membership, {
    merchant: { merchantId: 'merchant_b', name: 'Otro comercio' }, branch: { ...branch, branchId: 'branch_b' },
  }] };
  const result = parseMeResponse(source);
  assert.deepEqual(result, source);
  assert.ok(Object.isFrozen(result.memberships));
  assert.ok(Object.isFrozen(result.memberships[0]?.merchant));
  assert.notEqual(result.memberships[0]?.merchant, merchant);
  assert.deepEqual(parseMerchantBranchesResponse({ merchant, branches: [branch] }), { merchant, branches: [branch] });
});

test('merchant context: closes every level and rejects PII, malformed IDs and infrastructure data', () => {
  const valid = { subjectId, memberships: [membership] };
  for (const value of [null, [], {}, { ...valid, email: 'private@example.test' },
    { ...valid, subjectId: 'forged' }, { ...valid, memberships: null },
    { ...valid, memberships: [{ ...membership, role: 'admin' }] },
    { ...valid, memberships: [{ merchant: { ...merchant, enabled: true }, branch }] },
    { ...valid, memberships: [{ merchant, branch: { ...branch, latitude: 0 } }] },
    { ...valid, memberships: [{ merchant, branch: { ...branch, branchId: '../b' } }] },
    { ...valid, memberships: [{ merchant: { ...merchant, name: '' }, branch }] },
    { ...valid, memberships: [{ merchant, branch: { ...branch, name: 123 } }] },
  ]) assert.throws(() => parseMeResponse(value), InvalidMerchantContext);
  for (const value of [{ merchant, branches: [] }, { merchant, branches: null },
    { merchant, branches: [branch], subjectId }, { merchant, branches: [{ ...branch, phone: 'private' }] },
    { merchant: { ...merchant, merchantId: 'x'.repeat(129) }, branches: [branch] },
  ]) assert.throws(() => parseMerchantBranchesResponse(value), InvalidMerchantContext);
});

test('merchant context schema: formal DTOs close all public levels and retain identifiers only', async () => {
  const schema = JSON.parse(await readFile(new URL('../merchant-context.schema.json', import.meta.url), 'utf8'));
  for (const key of ['me', 'merchantBranches', 'membership', 'merchant', 'branch']) {
    const definition = schema.$defs[key];
    assert.equal(definition.additionalProperties, false);
    assert.deepEqual([...definition.required].sort(), Object.keys(definition.properties).sort());
  }
  assert.deepEqual(schema.$defs.me.required, ['subjectId', 'memberships']);
  assert.deepEqual(schema.$defs.merchant.required, ['merchantId', 'name']);
  assert.deepEqual(schema.$defs.branch.required, ['branchId', 'name']);
  assert.equal(schema.$defs.merchantBranches.properties.branches.minItems, 1);
});
