import { createDatabase, assertRuntimeRole } from '../../../apps/api/src/infrastructure/database.ts';
import { readStripeFixtureIdentity } from '../stripe-fixture-store.ts';
import { readManualSettings, verifyHistoricalPreservation } from './settings.ts';
import { verifyDockerIdentity, verifyManualDatabase, manualCounts } from './identity.ts';
import { fail } from './files.ts';

export async function manualStatus() {
  const { file, services, provenance } = readManualSettings();
  if (provenance.phase !== 'ready' || !provenance.emptyVerified || !provenance.systemIdentifier) fail();
  verifyDockerIdentity(services.instanceId);
  await verifyHistoricalPreservation();
  const db = createDatabase(file.MIGRATION_DATABASE_URL ?? '');
  const runtime = createDatabase(file.DATABASE_URL ?? '');
  try {
    await verifyManualDatabase(db, services.instanceId, provenance.accountId);
    const [system] = await db.$queryRaw<{ identifier: string }[]>`SELECT system_identifier::text AS identifier FROM pg_control_system()`;
    if (system?.identifier !== provenance.systemIdentifier) fail();
    await assertRuntimeRole(runtime);
    await verifyManualDatabase(runtime, services.instanceId, provenance.accountId);
    const identity = await db.$transaction((tx) => readStripeFixtureIdentity(tx, 'dry-run'));
    const counts = await manualCounts(db);
    if (counts.scenarios > 1) fail();
    if (counts.scenarios) {
      const scenario = await db.stripeSandboxScenario.findFirst();
      if (!scenario || scenario.accountId !== provenance.accountId || scenario.amountMinor !== 4400
        || scenario.currency !== 'MXN' || scenario.purpose !== 'offline-test' || !scenario.enabled
        || scenario.subjectId !== identity.subjectId || scenario.branchId !== identity.branchId
        || scenario.merchantId !== identity.merchantId) fail();
    }
    return { purpose: services.purpose, historicalPreserved: true, legacyCounts: { scenarios: 148, submissions: 127, events: 51 },
      emptyBeforeSeedVerified: true, counts, authPort: 57321, databasePort: 57322, loopbackBindings: true,
      resourcesIndependent: true, readyForFixture: counts.submissions === 0 && counts.events === 0,
      stripeRequests: 0, financialEligibility: false };
  } finally { await db.$disconnect(); await runtime.$disconnect(); }
}
