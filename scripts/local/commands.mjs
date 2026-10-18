import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

export function command(executable, args, options = {}) {
  return execFileSync(executable, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...options });
}

export function pnpm(args, options = {}) {
  const runner = process.env.npm_execpath;
  if (!runner || !existsSync(runner)) throw new Error('Ejecuta este comando mediante pnpm run.');
  return command(process.execPath, [runner, ...args], options);
}

export function loadLocalEnv() {
  const file = resolve('.env.local');
  if (!existsSync(file)) throw new Error('Ejecuta pnpm local:up primero.');
  process.loadEnvFile(file);
  return process.env;
}

export function savePrivateFile(file, content) {
  mkdirSync('.local', { recursive: true });
  writeFileSync(file, content, { mode: 0o600 });
}

export function runQuietly(label, operation) {
  console.log(label);
  try { return operation(); }
  catch (error) {
    // CLI status/start and connection failures may contain credentials. Never echo them.
    savePrivateFile('.local/last-error.log', String(error.stderr ?? error.message));
    throw new Error(`${label}: falló. Detalles locales en .local/last-error.log (no compartir sin revisar).`);
  }
}

export const composeArgs = ['compose', '--env-file', '.env.local', '-f', 'compose.yaml'];
