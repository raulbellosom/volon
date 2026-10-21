import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { PrismaClient } from '@prisma/client';
import { docker, project, volume, provenanceFile, fail } from './files.ts';
import { MANUAL_STRIPE_PURPOSE } from '../../../apps/api/src/infrastructure/stripe-test/local-services.ts';
import type { HistoricalEvidence } from './history.ts';

export interface ManualProvenance {
  readonly version: 1;
  readonly instanceId: string;
  readonly accountId: string;
  readonly legacy: HistoricalEvidence;
  readonly phase: 'creating' | 'ready';
  readonly systemIdentifier?: string;
  readonly emptyVerified?: boolean;
}
export function readProvenance(): ManualProvenance {
  const raw: unknown = JSON.parse(readFileSync(provenanceFile, 'utf8'));
  if (!raw || typeof raw !== 'object' || !('version' in raw) || raw.version !== 1
    || !('instanceId' in raw) || typeof raw.instanceId !== 'string'
    || !('accountId' in raw) || typeof raw.accountId !== 'string' || !('legacy' in raw)
    || !('phase' in raw) || !['creating', 'ready'].includes(String(raw.phase))) fail();
  if (raw.phase === 'ready' && (!('emptyVerified' in raw) || raw.emptyVerified !== true
    || !('systemIdentifier' in raw) || typeof raw.systemIdentifier !== 'string' || !/^\d+$/.test(raw.systemIdentifier))) fail();
  return raw as ManualProvenance;
}
export function validateDockerResources(containers: readonly {
  Config: { Labels: Record<string, string> }; NetworkSettings: { Networks: Record<string, unknown>; Ports: Record<string, null | { HostIp: string; HostPort: string }[]> };
  Mounts: readonly { Type: string; Name?: string; Destination: string; Source?: string; RW?: boolean }[];
}[], instanceId: string, expectedCount = 3) {
  if (containers.length !== expectedCount) fail();
  const published: string[] = [];
  const services = new Set<string>();
  for (const container of containers) {
    if (container.Config.Labels['delivery.purpose'] !== MANUAL_STRIPE_PURPOSE
      || container.Config.Labels['delivery.instance'] !== instanceId
      || Object.keys(container.NetworkSettings.Networks).join() !== project) fail();
    const service = container.Config.Labels['com.docker.compose.service'];
    if (!service || !['db', 'auth', 'gateway'].includes(service) || services.has(service)) fail();
    services.add(service);
    for (const [port, bindings] of Object.entries(container.NetworkSettings.Ports)) {
      if (bindings === null) continue;
      for (const binding of bindings) published.push(binding.HostIp + ':' + binding.HostPort);
      if (bindings.some((binding) => binding.HostIp !== '127.0.0.1'
        || !((service === 'db' && port === '5432/tcp' && binding.HostPort === '57322')
          || (service === 'gateway' && port === '8000/tcp' && binding.HostPort === '57321')))) fail();
    }
    for (const mount of container.Mounts) {
      if (mount.Type === 'volume') {
        if (service !== 'db' || mount.Name !== volume || mount.Destination !== '/var/lib/postgresql/manual') fail();
      } else {
        const file = service === 'db' ? 'postgres.sh' : service === 'gateway' ? 'kong.yml' : '';
        const normalize = (path: string) => path.replaceAll('\\', '/').toLowerCase()
          .replace(/^\/run\/desktop\/mnt\/host\/([a-z])\//, '$1:/');
        if (!file || mount.Type !== 'bind' || mount.RW !== false || mount.Destination !== '/manual/' + file
          || normalize(mount.Source ?? '') !== normalize(resolve('infra/stripe-manual', file))) fail();
      }
    }
  }
  const expected = expectedCount === 1 ? ['127.0.0.1:57322'] : ['127.0.0.1:57321', '127.0.0.1:57322'];
  if (published.sort().join() !== expected.join()) fail();
  if (!containers.some((container) => container.Mounts.some((mount) => mount.Name === volume && mount.Destination === '/var/lib/postgresql/manual'))) fail();
}
export function verifyDatabaseContainer(instanceId: string) {
  const ids = docker(['ps', '-q', '--filter', `label=com.docker.compose.project=${project}`,
    '--filter', 'label=com.docker.compose.service=db']).trim().split(/\s+/).filter(Boolean);
  if (ids.length !== 1) fail();
  validateDockerResources(JSON.parse(docker(['inspect', ...ids])), instanceId, 1);
}
export function verifyDockerIdentity(instanceId: string, beforeStart = false) {
  const ids = docker(['ps', beforeStart ? '-aq' : '-q', '--filter', `label=com.docker.compose.project=${project}`]).trim().split(/\s+/).filter(Boolean);
  if (ids.length !== 3) fail();
  const containers = JSON.parse(docker(['inspect', ...ids]));
  if (beforeStart) for (const container of containers) container.NetworkSettings.Ports = container.HostConfig.PortBindings;
  validateDockerResources(containers, instanceId);
  const [network] = JSON.parse(docker(['network', 'inspect', project]));
  const [disk] = JSON.parse(docker(['volume', 'inspect', volume]));
  for (const resource of [network, disk])
    if (resource?.Labels?.['delivery.instance'] !== instanceId || resource?.Labels?.['delivery.purpose'] !== MANUAL_STRIPE_PURPOSE) fail();
  if (network.Internal !== false || (!beforeStart && Object.keys(network.Containers ?? {}).length !== 3)) fail();
}
export async function verifyManualDatabase(db: PrismaClient, instanceId: string, accountId: string) {
  const [row] = await db.$queryRaw<{ valid: boolean }[]>`
    SELECT count(*) = 1 AND bool_and("instanceId"::text = ${instanceId} AND "accountId" = ${accountId}
      AND purpose = 'manual-stripe-test-v1') AS valid FROM local_control."Environment"`;
  if (!row?.valid) fail();
}
export async function manualCounts(db: PrismaClient) {
  return { scenarios: await db.stripeSandboxScenario.count(), submissions: await db.stripeSandboxSubmission.count(), events: await db.stripeSandboxEvent.count() };
}
