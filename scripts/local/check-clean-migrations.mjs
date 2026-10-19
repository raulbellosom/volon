import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { setTimeout } from 'node:timers/promises';

// Disposable PostgreSQL only: no ports, no host mounts, no existing database/volume.
const name = `delivery-clean-migrations-${randomUUID()}`;
const image = 'public.ecr.aws/supabase/postgres:17.11.0.004';
function docker(args, input) {
  return execFileSync('docker', args, { encoding: 'utf8', input, stdio: ['pipe', 'pipe', 'pipe'], timeout: 120000 });
}
let created = false;
try {
  docker(['run', '-d', '--rm', '--network', 'none', '--name', name,
    '--label', 'delivery.test=clean-migrations', '--user', 'postgres', '--entrypoint', 'bash', image, '-c',
    'initdb -D /tmp/courier-pg --auth=trust -U migration_owner > /tmp/init.log && exec postgres -D /tmp/courier-pg -k /tmp']);
  created = true;
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      docker(['exec', name, 'pg_isready', '-h', '/tmp', '-U', 'migration_owner']);
      ready = true;
      break;
    }
    catch { await setTimeout(500); }
  }
  if (!ready) throw new Error('Disposable PostgreSQL unavailable');
  // A new cluster initialized directly, without Supabase's service/bootstrap roles or data.
  const sql = (text) => docker(['exec', '-i', name, 'psql', '-h', '/tmp', '-U', 'migration_owner', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-At'], text);
  sql(`CREATE SCHEMA IF NOT EXISTS extensions;
    DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon; END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated; END IF; END $$;`);
  const migrations = readdirSync('prisma/migrations', { withFileTypes: true }).filter((entry) => entry.isDirectory())
    .map((entry) => entry.name).sort();
  for (const migration of migrations) {
    let legacy;
    if (migration === '202610190003_delivery_public_reference') {
      sql(readFileSync('scripts/local/fixtures/delivery-before-reference.sql', 'utf8'));
      legacy = sql(`SELECT to_jsonb(d)::text FROM app."Delivery" d WHERE id = 'legacy_delivery';`).trim();
    }
    const migrationSql = readFileSync(`prisma/migrations/${migration}/migration.sql`, 'utf8');
    sql(migrationSql.trimStart().startsWith('BEGIN;') ? migrationSql : `BEGIN;\n${migrationSql}\nCOMMIT;`);
    if (legacy) {
      if (sql(`SELECT to_jsonb(d)::text FROM app."Delivery" d WHERE id = 'legacy_delivery';`).trim() !== legacy)
        throw new Error('Backfill changed a historical Delivery');
      const reference = sql(`SELECT "publicReference" FROM app."DeliveryPublicReference" WHERE "deliveryId" = 'legacy_delivery';`).trim();
      if (!/^VL-\d{2}-[23456789ABCDEFGHJKMNPQRSTVWXYZ]{6}$/.test(reference)) throw new Error('Backfill missing');
      if (!sql(`SELECT app.backfill_delivery_public_references('AB');`).trim().endsWith('0')) throw new Error('Backfill not idempotent');
      if (sql(`SELECT "publicReference" FROM app."DeliveryPublicReference" WHERE "deliveryId" = 'legacy_delivery';`).trim() !== reference)
        throw new Error('Rebranding changed historical reference');
      console.log('Backfill histórico íntegro, idempotente y estable ante cambio de prefijo.');
    }
    console.log(`Migración limpia correcta: ${migration}`);
  }
  const flags = sql(`SELECT count(*) FROM pg_class WHERE relnamespace = 'app'::regnamespace
    AND relname IN ('Courier', 'CourierShift', 'CourierAvailabilityCommand') AND relrowsecurity AND relforcerowsecurity;`).trim();
  if (flags !== '3') throw new Error('Missing Courier FORCE RLS');
  const labFlags = sql(`SELECT count(*) FROM pg_class WHERE relnamespace = 'app'::regnamespace
    AND relname IN ('DispatchLabScenario', 'DispatchLabOffer', 'DispatchLabAssignment', 'DispatchLabCommand', 'DispatchLabOutbox')
    AND relrowsecurity AND relforcerowsecurity;`).trim();
  if (labFlags !== '5') throw new Error('Missing DispatchLab FORCE RLS');
  const exclusions = sql(`SELECT count(*) FROM pg_index WHERE indrelid = 'app."DispatchLabAssignment"'::regclass
    AND indisunique AND indpred IS NOT NULL;`).trim();
  if (exclusions !== '2') throw new Error('Missing DispatchLab exclusivity indexes');
  const referenceRls = sql(`SELECT count(*) FROM pg_class WHERE relnamespace = 'app'::regnamespace
    AND relname = 'DeliveryPublicReference' AND relrowsecurity AND relforcerowsecurity;`).trim();
  if (referenceRls !== '1') throw new Error('Missing public reference FORCE RLS');
  const isolated = sql(`SET ROLE delivery_api; SELECT count(*) FROM app."Courier";`).trim();
  if (!isolated.endsWith('0')) throw new Error('Unexpected unscoped data');
  const financeRls = sql(`SELECT count(*) FROM pg_class WHERE relnamespace = 'app'::regnamespace
    AND relname IN ('ServicePaymentIntent','ServicePaymentAttempt','ServicePaymentCommand','PaymentEvidenceLabCase','PaymentEvidenceLabEvent')
    AND relrowsecurity AND relforcerowsecurity;`).trim();
  if (financeRls !== '5') throw new Error('Missing financial FORCE RLS');
  if (sql(`SELECT count(*) FROM app."ServicePaymentIntent";`).trim() !== '0') throw new Error('Unexpected payment backfill');
  const unauthenticatedFinance = sql(`SET ROLE delivery_api; SELECT count(*) FROM app."ServicePaymentIntent";`).trim();
  if (!unauthenticatedFinance.endsWith('0')) throw new Error('Unscoped financial data');
  console.log(`${migrations.length} migraciones probadas en PostgreSQL limpio; Courier/DispatchLab/folios/finanzas FORCE RLS; doble exclusión y backfill íntegro, sin pagos inventados; sin tocar el stack existente.`);
} catch (error) {
  mkdirSync('.local', { recursive: true });
  writeFileSync('.local/clean-migrations-error.log', String(error.stderr ?? error.message), { mode: 0o600 });
  console.error('Falló validación de migraciones en PostgreSQL desechable. No se imprimen credenciales.');
  process.exitCode = 1;
} finally {
  if (created) {
    const existing = docker(['ps', '-aq', '--filter', `name=^/${name}$`]).trim();
    if (existing) {
      const label = docker(['inspect', '--format', '{{index .Config.Labels "delivery.test"}}', name]).trim();
      if (label !== 'clean-migrations') throw new Error('Refusing cleanup of an unexpected container');
      docker(['stop', name]);
    }
  }
}
