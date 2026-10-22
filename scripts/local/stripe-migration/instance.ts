import { readPrivateEnv, guardManualProcess, docker, project, volume } from '../stripe-manual/files.ts';
import { readProvenance, verifyDockerIdentity } from '../stripe-manual/identity.ts';
import { manualStripeServices } from '../../../apps/api/src/infrastructure/stripe-test/local-services.ts';
import { sql, imageOf, literal, type Target } from './database.ts';
import { blocked, sha } from './manifest.ts';
import { createDatabase, assertRuntimeRole } from '../../../apps/api/src/infrastructure/database.ts';

// No connection to the historical stack; no Auth or Stripe client is constructed.
export async function manualInstance() {
  guardManualProcess();
  const file = readPrivateEnv('.env.stripe-manual.local');
  const services = manualStripeServices(file), provenance = readProvenance();
  if (provenance.phase !== 'ready' || provenance.instanceId !== services.instanceId
    || file.STRIPE_SANDBOX_ACCOUNT_ID !== provenance.accountId) blocked('INSTANCE_CONFIGURATION_MISMATCH');
  verifyDockerIdentity(provenance.instanceId);
  const container = docker(['ps','-q','--filter',`label=com.docker.compose.project=${project}`,
    '--filter','label=com.docker.compose.service=db']).trim();
  const target: Target = { container, user: 'postgres' };
  const marker = JSON.parse(sql(target, 'SELECT row_to_json(e) FROM local_control."Environment" e'));
  const identifier = sql(target, 'SELECT system_identifier::text FROM pg_control_system()');
  if (marker.instanceId !== provenance.instanceId || marker.accountId !== provenance.accountId
    || marker.systemIdentifier !== identifier || identifier !== provenance.systemIdentifier
    || marker.purpose !== services.purpose) blocked('INSTANCE_MARKER_MISMATCH');
  if (sql(target, `SELECT string_agg(datname,',' ORDER BY datname) FROM pg_database WHERE NOT datistemplate`) !== 'postgres'
    || sql(target, `SELECT count(*) FROM pg_tablespace WHERE spcname NOT IN ('pg_default','pg_global')`) !== '0'
    || sql(target, `SELECT count(*) FROM pg_roles WHERE rolname='migration_restore'`) !== '0') blocked('CLUSTER_SCOPE_MISMATCH');
  if (sql(target, `SELECT count(*) FROM app."StripeSandboxScenario" WHERE "accountId"=${literal(provenance.accountId)}
      AND "branchId"='branch_synthetic_a' AND "merchantId"='merchant_synthetic_a'
      AND "amountMinor"=4400 AND currency='MXN' AND purpose='offline-test' AND enabled`) !== '1') blocked('MANUAL_SCENARIO_MISMATCH');
  const admin = new URL(file.MIGRATION_DATABASE_URL ?? '');
  if (admin.protocol !== 'postgresql:' || admin.hostname !== '127.0.0.1' || admin.port !== '57322'
    || admin.username !== 'postgres' || !/^[a-f0-9]{64}$/.test(admin.password) || admin.pathname !== '/postgres'
    || admin.search !== '?schema=app' || admin.hash) blocked('INSTANCE_CONFIGURATION_MISMATCH');
  const runtimeUrl = file.DATABASE_URL ?? '';
  if (!/^[a-f0-9]{64}$/.test(new URL(runtimeUrl).password)) blocked('INSTANCE_CONFIGURATION_MISMATCH');
  const db = createDatabase(admin.toString()), runtime = createDatabase(runtimeUrl);
  try {
    await db.$transaction(async (tx) => {
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      const [control] = await tx.$queryRaw<{ identifier: string }[]>`SELECT system_identifier::text AS identifier FROM pg_control_system()`;
      if (control?.identifier !== identifier) blocked('TCP_DATABASE_IDENTITY_MISMATCH');
    });
    await runtime.$transaction(async (tx) => {
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      await assertRuntimeRole(tx);
      const [control] = await tx.$queryRaw<{ instanceId: string; accountId: string }[]>`SELECT "instanceId"::text,"accountId" FROM local_control."Environment"`;
      if (control?.instanceId !== provenance.instanceId || control.accountId !== provenance.accountId) blocked('RUNTIME_IDENTITY_MISMATCH');
    });
  } finally { await Promise.all([db.$disconnect(),runtime.$disconnect()]); }
  const disk = JSON.parse(docker(['volume','inspect',volume]))[0];
  const network = JSON.parse(docker(['network','inspect',project]))[0];
  if (disk.Driver !== 'local' || disk.Scope !== 'local' || Object.keys(disk.Options ?? {}).length !== 0
    || network.Driver !== 'bridge' || network.Scope !== 'local') blocked('DOCKER_STORAGE_OR_NETWORK_MISMATCH');
  const identity = { container, image: imageOf(container), instance: provenance.instanceId, identifier,
    volume, volumeCreated: disk.CreatedAt, volumeDriver: disk.Driver, network: network.Id,
    configurationDigest: sha(JSON.stringify({ admin: admin.toString(), runtime: runtimeUrl, services })),
    accountDigest: sha(provenance.accountId), markerDigest: sha(JSON.stringify(marker)) };
  return { target, identity };
}
