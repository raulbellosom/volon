import { createDatabase } from '../../../apps/api/src/infrastructure/database.ts';
import { createSupabaseAuthenticator } from '../../../apps/api/src/infrastructure/supabase-auth.adapter.ts';
import { docker, compose, readPrivateEnv, dockerFile, run, systemEnvironment, writePrivate, provenanceFile, fail } from './files.ts';
import { readManualSettings, localJwt } from './settings.ts';
import { manualCounts, verifyManualDatabase, verifyDockerIdentity, verifyDatabaseContainer } from './identity.ts';

async function localAuth(path: string, body: unknown, authorization: string) {
  const response = await fetch('http://127.0.0.1:57321/auth/v1/' + path, { method: 'POST', redirect: 'error',
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + authorization },
    body: JSON.stringify(body), signal: AbortSignal.timeout(5000) });
  if (!response.ok) fail();
  return response.json() as Promise<Record<string, unknown>>;
}

export async function bootstrapManualDatabase(step: (value: string) => void = () => {}) {
  const { file, services, provenance } = readManualSettings();
  const privateDocker = readPrivateEnv(dockerFile);
  if (privateDocker.MANUAL_INSTANCE_ID !== services.instanceId || !/^[a-f0-9]{64}$/.test(privateDocker.MANUAL_AUTH_DB_PASSWORD ?? '')) fail();
  step('database');
  docker([...compose, 'up', '-d', '--wait', '--wait-timeout', '120', 'db']);
  verifyDatabaseContainer(services.instanceId);
  const db = createDatabase(file.MIGRATION_DATABASE_URL ?? '');
  try {
    // All SQL below targets only the newly allocated port/volume. No migration command sees Stripe credentials.
    for (const name of ['anon', 'authenticated', 'service_role']) {
      const rows = await db.$queryRaw<{ exists: boolean }[]>`SELECT EXISTS(SELECT FROM pg_roles WHERE rolname = ${name}) AS exists`;
      if (!rows[0]?.exists) await db.$executeRawUnsafe(`CREATE ROLE ${name} NOLOGIN`);
    }
    const authRole = await db.$queryRaw<{ exists: boolean }[]>`SELECT EXISTS(SELECT FROM pg_roles WHERE rolname = 'supabase_auth_admin') AS exists`;
    if (!authRole[0]?.exists) await db.$executeRawUnsafe(`CREATE ROLE supabase_auth_admin LOGIN NOINHERIT PASSWORD '${privateDocker.MANUAL_AUTH_DB_PASSWORD}'`);
    await db.$executeRaw`CREATE SCHEMA IF NOT EXISTS auth AUTHORIZATION supabase_auth_admin`;
    await db.$executeRaw`CREATE SCHEMA IF NOT EXISTS extensions`;
    await db.$executeRaw`CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions`;
    await db.$executeRaw`GRANT USAGE ON SCHEMA extensions TO supabase_auth_admin`;
    const runner = process.env.npm_execpath;
    if (!runner) fail();
    step('migrations');
    run(process.execPath, [runner, 'exec', 'prisma', 'migrate', 'deploy'],
      { ...systemEnvironment(), MIGRATION_DATABASE_URL: file.MIGRATION_DATABASE_URL, PRISMA_HIDE_UPDATE_MESSAGE: 'true' });
    const counts = await manualCounts(db);
    if (counts.scenarios || counts.submissions || counts.events) fail();
    const [system] = await db.$queryRaw<{ identifier: string }[]>`SELECT system_identifier::text AS identifier FROM pg_control_system()`;
    if (!system?.identifier || (provenance.systemIdentifier && provenance.systemIdentifier !== system.identifier)) fail();
    await db.$executeRaw`CREATE SCHEMA IF NOT EXISTS local_control`;
    await db.$executeRaw`CREATE TABLE IF NOT EXISTS local_control."Environment" (
      singleton BOOLEAN PRIMARY KEY DEFAULT true CHECK(singleton), "instanceId" UUID UNIQUE NOT NULL,
      purpose TEXT NOT NULL CHECK(purpose = 'manual-stripe-test-v1'), "accountId" TEXT NOT NULL,
      "systemIdentifier" TEXT NOT NULL, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp())`;
    await db.$executeRaw`INSERT INTO local_control."Environment" ("instanceId", purpose, "accountId", "systemIdentifier")
      VALUES (${services.instanceId}::uuid, 'manual-stripe-test-v1', ${provenance.accountId}, ${system.identifier}) ON CONFLICT DO NOTHING`;
    await verifyManualDatabase(db, services.instanceId, provenance.accountId);
    await db.$executeRaw`REVOKE ALL ON SCHEMA local_control FROM PUBLIC`;
    await db.$executeRaw`GRANT USAGE ON SCHEMA local_control TO delivery_api`;
    await db.$executeRaw`GRANT SELECT ON local_control."Environment" TO delivery_api`;
    await db.$executeRaw`ALTER TABLE local_control."Environment" ENABLE ROW LEVEL SECURITY`;
    await db.$executeRaw`ALTER TABLE local_control."Environment" FORCE ROW LEVEL SECURITY`;
    const [policy] = await db.$queryRaw<{ exists: boolean }[]>`SELECT EXISTS(SELECT FROM pg_policies
      WHERE schemaname = 'local_control' AND tablename = 'Environment' AND policyname = 'manual_runtime_read') AS exists`;
    if (!policy?.exists) await db.$executeRaw`CREATE POLICY manual_runtime_read ON local_control."Environment" FOR SELECT TO delivery_api USING (true)`;
    const runtime = new URL(file.DATABASE_URL ?? '');
    await db.$executeRawUnsafe(`ALTER ROLE delivery_api PASSWORD '${runtime.password}'`);
    step('auth');
    docker([...compose, 'up', '-d']);
    verifyDockerIdentity(services.instanceId);
    let ready = false;
    for (let attempt = 0; attempt < 40; attempt++) {
      try { ready = (await fetch('http://127.0.0.1:57321/auth/v1/health', { signal: AbortSignal.timeout(1000) })).ok; } catch { /* Bounded local startup. */ }
      if (ready) break;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    if (!ready) fail();
    step('seed');
    const users = await db.$queryRaw<{ id: string }[]>`SELECT id::text FROM auth.users WHERE email = 'merchant-a@example.test' AND deleted_at IS NULL`;
    let subjectId = users[0]?.id;
    if (users.length > 1) fail();
    if (!subjectId) {
      const user = await localAuth('admin/users', { email: 'merchant-a@example.test', password: file.SYNTHETIC_USER_PASSWORD, email_confirm: true },
        localJwt(privateDocker.MANUAL_JWT_SECRET ?? '', 'service_role'));
      if (typeof user.id !== 'string') fail();
      subjectId = user.id;
    }
    await db.$transaction(async (tx) => {
      await tx.merchant.upsert({ where: { id: 'merchant_synthetic_a' }, update: {}, create: { id: 'merchant_synthetic_a', name: 'Comercio sintético manual' } });
      await tx.branch.upsert({ where: { id: 'branch_synthetic_a' }, update: {},
        create: { id: 'branch_synthetic_a', merchantId: 'merchant_synthetic_a', name: 'Sucursal sintética manual', latitude: 0, longitude: 0 } });
      await tx.membership.upsert({ where: { id: 'membership_synthetic_a' }, update: {},
        create: { id: 'membership_synthetic_a', subjectId, branchId: 'branch_synthetic_a', merchantId: 'merchant_synthetic_a' } });
      const membership = await tx.membership.findUnique({ where: { id: 'membership_synthetic_a' } });
      if (!membership?.enabled || membership.subjectId !== subjectId) fail();
    });
    const token = await localAuth('token?grant_type=password', { email: 'merchant-a@example.test', password: file.SYNTHETIC_USER_PASSWORD }, file.SUPABASE_PUBLISHABLE_KEY ?? '');
    if (typeof token.access_token !== 'string') fail();
    const actor = await createSupabaseAuthenticator(services.authOrigin, file.SUPABASE_PUBLISHABLE_KEY ?? '')(
      new Request('http://127.0.0.1/manual', { headers: { authorization: 'Bearer ' + token.access_token } }));
    if (actor?.subjectId !== subjectId) fail();
    writePrivate(provenanceFile, JSON.stringify({ ...provenance, systemIdentifier: system.identifier, emptyVerified: true, phase: 'ready' }) + '\n');
  } finally { await db.$disconnect(); }
}
