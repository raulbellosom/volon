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
    sql(`BEGIN;\n${readFileSync(`prisma/migrations/${migration}/migration.sql`, 'utf8')}\nCOMMIT;`);
    console.log(`Migración limpia correcta: ${migration}`);
  }
  const flags = sql(`SELECT count(*) FROM pg_class WHERE relnamespace = 'app'::regnamespace
    AND relname IN ('Courier', 'CourierShift', 'CourierAvailabilityCommand') AND relrowsecurity AND relforcerowsecurity;`).trim();
  if (flags !== '3') throw new Error('Missing Courier FORCE RLS');
  const isolated = sql(`SET ROLE delivery_api; SELECT count(*) FROM app."Courier";`).trim();
  if (!isolated.endsWith('0')) throw new Error('Unexpected unscoped data');
  console.log(`${migrations.length} migraciones probadas en PostgreSQL limpio; 3 tablas Courier FORCE RLS; sin tocar el stack existente.`);
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
