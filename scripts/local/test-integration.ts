import { loadOfflineIntegrationEnvironment } from '../../apps/api/integration/integration-environment.ts';
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';

try { loadOfflineIntegrationEnvironment(); }
catch {
  console.error('AUTOMATED_INTEGRATION_BLOCKED: usa un stack desechable separado sin configuración Stripe manual.');
  process.exit(1);
}
const tests = readdirSync('apps/api/integration').filter((name) => name.endsWith('.test.ts')).sort()
  .map((name) => 'apps/api/integration/' + name);
const result = spawnSync(process.execPath, ['--experimental-strip-types', '--test', '--test-concurrency=1', ...tests], { stdio: 'inherit' });
process.exitCode = result.status ?? 1;
