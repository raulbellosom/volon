// Test-only process: credentials arrive over private IPC, never argv, env or output.
import { createDatabase } from '../src/infrastructure/database.ts';
import { prepareStripeFixtureScenario } from '../../../scripts/local/stripe-fixture-store.ts';

process.once('message', async (value: unknown) => {
  try {
    if (!value || typeof value !== 'object' || !('databaseUrl' in value) || typeof value.databaseUrl !== 'string'
      || !('subjectId' in value) || typeof value.subjectId !== 'string'
      || !('branchId' in value) || typeof value.branchId !== 'string'
      || !('merchantId' in value) || typeof value.merchantId !== 'string') throw new Error();
    const url = new URL(value.databaseUrl);
    if (url.hostname !== '127.0.0.1' || url.port !== '56322' || url.username !== 'postgres') throw new Error();
    const db = createDatabase(value.databaseUrl);
    const identity = { subjectId: value.subjectId, branchId: value.branchId, merchantId: value.merchantId };
    let result;
    try { result = await db.$transaction((tx) => prepareStripeFixtureScenario(tx, identity, 'acct_fixture', 'create')); }
    finally { await db.$disconnect(); }
    process.send?.(result, () => process.disconnect());
  } catch { process.send?.({ error: 'FIXTURE_WORKER_FAILED' }, () => process.disconnect()); }
});
