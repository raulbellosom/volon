import { existsSync, mkdirSync, openSync, closeSync, unlinkSync } from 'node:fs';
import { createServer } from 'node:net';
import { MANUAL_STRIPE_ENV_FILE } from '../../apps/api/src/infrastructure/stripe-test/local-services.ts';
import { guardManualProcess, docker, compose, project, volume, fail, provenanceFile } from './stripe-manual/files.ts';
import { initializePrivateSettings, readManualSettings, verifyHistoricalPreservation } from './stripe-manual/settings.ts';
import { bootstrapManualDatabase } from './stripe-manual/bootstrap.ts';
import { manualStatus } from './stripe-manual/status.ts';
import { verifyDockerIdentity } from './stripe-manual/identity.ts';

let stage = 'configuration';
async function assertPortsFree() {
  for (const port of [57321, 57322]) await new Promise<void>((resolve, reject) => {
    const server = createServer();
    server.once('error', () => reject(new Error('PORT_COLLISION')));
    server.listen(port, '127.0.0.1', () => server.close(() => resolve()));
  });
}
async function main() {
  guardManualProcess();
  const args = process.argv.slice(2);
  if (args.length !== 1 || !['up', 'status'].includes(args[0] ?? '')) fail();
  if (args[0] === 'up') {
    mkdirSync('.local/stripe-manual', { recursive: true });
    const lock = '.local/stripe-manual/provision.lock';
    const handle = openSync(lock, 'wx', 0o600);
    try {
      if (!existsSync(MANUAL_STRIPE_ENV_FILE)) {
        await assertPortsFree();
        const networks = docker(['network', 'ls', '--format', '{{.Name}}']).split(/\s+/);
        const volumes = docker(['volume', 'ls', '--format', '{{.Name}}']).split(/\s+/);
        const containers = docker(['ps', '-aq', '--filter', `label=com.docker.compose.project=${project}`]).trim();
        if (networks.includes(project) || volumes.includes(volume) || containers || existsSync(provenanceFile)) fail();
        await initializePrivateSettings();
      }
      const { provenance } = readManualSettings();
      await verifyHistoricalPreservation();
      if (provenance.phase === 'creating') await bootstrapManualDatabase((value) => { stage = value; });
      else {
        verifyDockerIdentity(provenance.instanceId, true);
        docker([...compose, 'start', '--wait', '--wait-timeout', '120']);
      }
    } finally { closeSync(handle); unlinkSync(lock); }
  }
  stage = 'verification';
  console.log(JSON.stringify(await manualStatus(), null, 2));
}
main().catch((error: unknown) => {
  const record = error && typeof error === 'object' ? error : {};
  const code = 'code' in record && typeof record.code === 'string' && /^(P\d{4}|[0-9]{5})$/.test(record.code) ? record.code : undefined;
  console.error(JSON.stringify({ blocked: 'MANUAL_INSTANCE_BLOCKED', stage, ...(code ? { code } : {}), stripeRequests: 0 }));
  process.exitCode = 1;
});
