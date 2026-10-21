import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { MANUAL_STRIPE_ENV_FILE } from '../../../apps/api/src/infrastructure/stripe-test/local-services.ts';
import { assertLocalStripeTerminal } from '../../../apps/api/src/infrastructure/stripe-test/https-policy.ts';

export const project = 'delivery-stripe-manual';
export const volume = 'delivery-stripe-manual-db';
export const directory = '.local/stripe-manual';
export const dockerFile = directory + '/docker.env';
export const provenanceFile = directory + '/provenance.json';
export const compose = ['compose', '--project-name', project, '--env-file', dockerFile,
  '-f', 'infra/stripe-manual/compose.yaml'];
export function fail(): never { throw new Error('MANUAL_INSTANCE_BLOCKED'); }
export function guardManualProcess() {
  assertLocalStripeTerminal(process.env, true);
  if (process.execArgv.some((arg) => arg !== '--experimental-strip-types')) fail();
  for (const name of [MANUAL_STRIPE_ENV_FILE, '.env.local', dockerFile, provenanceFile])
    execFileSync('git', ['check-ignore', '--quiet', '--', name], { stdio: 'ignore' });
  if (Object.keys(process.env).some((key) => /^(STRIPE_|LOCAL_STRIPE_|DOCKER_HOST$|DOCKER_CONTEXT$|DOCKER_TLS_VERIFY$|DOCKER_CERT_PATH$|DATABASE_URL$|MIGRATION_DATABASE_URL$|SUPABASE_URL$)/i.test(key))) fail();
  const [context] = JSON.parse(docker(['context', 'inspect']));
  if (!/^(npipe|unix):\/\//.test(context?.Endpoints?.docker?.Host ?? '')) fail();
}
export function systemEnvironment() {
  return Object.fromEntries(Object.entries(process.env).filter(([key]) =>
    /^(PATH|PATHEXT|SYSTEMROOT|WINDIR|COMSPEC|TEMP|TMP|USERPROFILE|HOME|APPDATA|LOCALAPPDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|PROGRAMW6432|PROGRAMDATA|ALLUSERSPROFILE|HOMEDRIVE|HOMEPATH)$/i.test(key)));
}
export function run(command: string, args: string[], env = systemEnvironment()): string {
  return execFileSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 180000, env });
}
export const docker = (args: string[]) => run('docker', args);
export function readPrivateEnv(file: string) {
  const contents = readFileSync(file, 'utf8');
  if (Buffer.byteLength(contents) > 65536) fail();
  return parseEnv(contents);
}
export function writePrivate(file: string, contents: string, fresh = false) {
  mkdirSync(directory, { recursive: true });
  writeFileSync(file, contents, { mode: 0o600, flag: fresh ? 'wx' : 'w' });
}
export const envText = (values: Readonly<Record<string, string>>) => Object.entries(values).map(([key, value]) => `${key}=${value}`).join('\n') + '\n';
