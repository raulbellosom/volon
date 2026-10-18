import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { command, pnpm, runQuietly, savePrivateFile, composeArgs } from './commands.mjs';
import { verifyLocalNetwork } from './network-security.mjs';

runQuietly('Verificando Docker', () => command('docker', ['info']));
try { command('docker', ['network', 'inspect', 'delivery-local']); }
catch {
  command('docker', ['network', 'create', '--driver', 'bridge',
    '--opt', 'com.docker.network.bridge.host_binding_ipv4=127.0.0.1', 'delivery-local']);
}
runQuietly('Iniciando Supabase oficial (la primera descarga puede tardar)', () => {
  const output = pnpm(['exec', 'supabase', 'start', '--network-id', 'delivery-local']);
  savePrivateFile('.local/supabase-start.log', output);
});
try { console.log(`Protección de red: ${verifyLocalNetwork()}.`); }
catch (error) {
  if (existsSync('.env.local')) command('docker', [...composeArgs, 'stop']);
  pnpm(['exec', 'supabase', 'stop', '--project-id', 'delivery-local']);
  throw error;
}
const status = JSON.parse(runQuietly('Leyendo configuración local de Supabase', () =>
  pnpm(['exec', 'supabase', 'status', '-o', 'json'])));
if (!existsSync('.env.local')) {
  const database = new URL(status.DB_URL);
  database.searchParams.set('schema', 'app');
  const runtime = new URL(database);
  runtime.username = 'delivery_api';
  runtime.password = randomBytes(32).toString('hex');
  const container = new URL(runtime);
  container.hostname = 'supabase_db_delivery-local';
  container.port = '5432';
  const values = {
    MIGRATION_DATABASE_URL: database.href, DATABASE_URL: runtime.href,
    DATABASE_DOCKER_URL: container.href, SUPABASE_URL: status.API_URL,
    SUPABASE_PUBLISHABLE_KEY: status.PUBLISHABLE_KEY ?? status.ANON_KEY,
    SYNTHETIC_USER_PASSWORD: randomBytes(24).toString('hex'),
    LOCAL_SYNTHETIC_MODE: 'true', API_URL: 'http://127.0.0.1:3100',
  };
  savePrivateFile('.env.local', Object.entries(values).map(([key, value]) => `${key}=${value}`).join('\n') + '\n');
}
process.loadEnvFile('.env.local');
runQuietly('Generando Prisma Client', () => pnpm(['exec', 'prisma', 'generate']));
runQuietly('Aplicando migraciones Prisma', () => pnpm(['exec', 'prisma', 'migrate', 'deploy']));
runQuietly('Creando usuarios y datos sintéticos', () => pnpm(['run', 'local:seed']));
runQuietly('Construyendo y arrancando API/Redis', () =>
  command('docker', [...composeArgs, 'up', '--build', '-d', '--wait', '--wait-timeout', '120']));
console.log('Backend local disponible en http://127.0.0.1:3100; valida con pnpm test:integration.');
