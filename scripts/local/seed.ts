import { createDatabase } from '../../apps/api/src/infrastructure/database.ts';

process.loadEnvFile('.env.local');
function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing ${key}`);
  return value;
}
const url = required('SUPABASE_URL');
const databaseUrl = new URL(required('MIGRATION_DATABASE_URL'));
if (!['127.0.0.1', 'localhost'].includes(new URL(url).hostname)
  || !['127.0.0.1', 'localhost'].includes(databaseUrl.hostname)
  || databaseUrl.port !== '56322' || process.env.LOCAL_SYNTHETIC_MODE !== 'true') {
  throw new Error('Seed restricted to the isolated local synthetic stack');
}
const runtimeUrl = new URL(required('DATABASE_URL'));
if (runtimeUrl.username !== 'delivery_api' || !/^[a-f0-9]{64}$/.test(runtimeUrl.password)) {
  throw new Error('Invalid generated runtime credential');
}
const db = createDatabase(databaseUrl.href);
async function syntheticSubject(email: string): Promise<string> {
  const authenticate = async (path: string) => fetch(`${url}/auth/v1/${path}`, {
    method: 'POST', headers: { apikey: required('SUPABASE_PUBLISHABLE_KEY'), 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: required('SYNTHETIC_USER_PASSWORD') }), signal: AbortSignal.timeout(10000),
  });
  let response = await authenticate('token?grant_type=password');
  if (!response.ok) response = await authenticate('signup');
  if (!response.ok) throw new Error('Synthetic Auth provisioning failed');
  const body: unknown = await response.json();
  if (typeof body !== 'object' || body === null || !('user' in body)
    || typeof body.user !== 'object' || body.user === null || !('id' in body.user)
    || typeof body.user.id !== 'string') throw new Error('Invalid synthetic Auth user');
  return body.user.id;
}
try {
  // Random local-only role credential. Regex above makes SQL literal construction bounded.
  await db.$executeRawUnsafe(`ALTER ROLE delivery_api PASSWORD '${runtimeUrl.password}'`);
  for (const tenant of ['a', 'b']) {
    const subjectId = await syntheticSubject(`merchant-${tenant}@example.test`);
    await db.$transaction(async (tx) => {
      await tx.merchant.upsert({ where: { id: `merchant_synthetic_${tenant}` }, update: {},
        create: { id: `merchant_synthetic_${tenant}`, name: `Comercio sintético ${tenant.toUpperCase()}` } });
      await tx.branch.upsert({ where: { id: `branch_synthetic_${tenant}` }, update: {},
        create: { id: `branch_synthetic_${tenant}`, merchantId: `merchant_synthetic_${tenant}`,
          name: `Sucursal sintética ${tenant}`, latitude: 0, longitude: 0 } });
      await tx.membership.upsert({ where: { id: `membership_synthetic_${tenant}` }, update: { subjectId },
        create: { id: `membership_synthetic_${tenant}`, subjectId,
          merchantId: `merchant_synthetic_${tenant}`, branchId: `branch_synthetic_${tenant}` } });
    });
  }
  for (const suffix of ['a', 'b']) {
    const subjectId = await syntheticSubject(`courier-${suffix}@example.test`);
    const id = `courier_synthetic_${suffix}`;
    // Re-running seed preserves enabled, identity, version and existing availability.
    await db.courier.upsert({ where: { id }, update: {}, create: { id, subjectId,
      shift: { create: {} } } });
    const profile = await db.courier.findUniqueOrThrow({ where: { id } });
    if (profile.subjectId !== subjectId) throw new Error('Synthetic courier identity mismatch');
  }
  console.log('Dos comercios y dos couriers sintéticos provisionados sin credenciales en salida.');
} catch {
  console.error('Falló el seed local. Verifica Supabase y las migraciones; no se imprimen credenciales.');
  process.exitCode = 1;
} finally { await db.$disconnect(); }
