import { createDatabase } from '../../apps/api/src/infrastructure/database.ts';
import { loadStripeFixtureEnvironment, StripeFixtureFailure } from './stripe-fixture-environment.ts';
import { inspectStripeHistory } from './stripe-history-store.ts';

async function main() {
  if (process.argv.length !== 3 || process.argv[2] !== '--inspect') throw new StripeFixtureFailure('INVALID_COMMAND');
  if (process.execArgv.some((arg) => arg !== '--experimental-strip-types')) throw new StripeFixtureFailure('CONFIGURATION_INVALID');
  const local = await loadStripeFixtureEnvironment(process.env);
  const db = createDatabase(local.databaseUrl);
  try { console.log(JSON.stringify(await inspectStripeHistory(db, local.accountId), null, 2)); }
  finally { await db.$disconnect(); }
}
main().catch((error: unknown) => {
  console.error(JSON.stringify({ blocked: error instanceof StripeFixtureFailure ? error.code : 'INFRASTRUCTURE_UNAVAILABLE',
    readOnly: true, stripeRequestsByInspection: 0 }));
  process.exitCode = 1;
});
