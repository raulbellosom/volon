import assert from 'node:assert/strict';
import { test } from 'node:test';
import { admin, db } from './delivery-fixtures.ts';
import { inspectStripeHistory } from '../../../scripts/local/stripe-history-store.ts';
import { durable, eventBytes, signStripeFixture } from './stripe-persistence-fixtures.ts';

test('history SQL returns only sanitized aggregates and does not alter existing scenarios, submissions or events', async () => {
  // Harness refuses a manually configured stack. Run this only on the separate disposable integration stack.
  const s = await durable();
  await s.adapter.create(s.actor, s.input); s.remote.paid();
  const bytes = eventBytes('checkout.session.completed', s.remote.checkout, Date.now());
  await s.adapter.observe(s.actor, s.input, bytes, signStripeFixture(bytes, Date.now()));
  const before = await admin.stripeSandboxScenario.findMany({ where: { branchId: 'branch_synthetic_a' },
    include: { submission: { include: { events: { orderBy: { eventId: 'asc' } } } } }, orderBy: { id: 'asc' } });
  const report = await inspectStripeHistory(admin, 'acct_history_inspection_only');
  assert.equal(report.readOnly, true);
  assert.equal(report.scenarios, before.length);
  assert.equal(report.submissions, before.filter((row) => row.submission !== null).length);
  assert.equal(report.events, before.reduce((n, row) => n + (row.submission?.events.length ?? 0), 0));
  assert.ok(report.scenarios >= 1 && report.events >= 1);
  const after = await admin.stripeSandboxScenario.findMany({ where: { branchId: 'branch_synthetic_a' },
    include: { submission: { include: { events: { orderBy: { eventId: 'asc' } } } } }, orderBy: { id: 'asc' } });
  // Compare a boolean so even an assertion failure cannot dump sensitive rows.
  assert.equal(JSON.stringify(before) === JSON.stringify(after), true);
  assert.equal(report.stripeRequestsByInspection, 0);
  for (const row of before) {
    const output = JSON.stringify(report);
    for (const privateValue of [row.id, row.accountId, row.subjectId, row.submission?.key, row.submission?.hash])
      if (privateValue) assert.equal(output.includes(privateValue), false);
  }
  await assert.rejects(inspectStripeHistory(db, 'acct_history_inspection_only'), { code: 'AUTHORIZATION_DENIED' });
});
