import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { openSync, closeSync, fsyncSync, readFileSync } from 'node:fs';
import { setTimeout } from 'node:timers/promises';
import { docker, systemEnvironment } from '../stripe-manual/files.ts';
import { pgArgs, sql, snapshot, sameEvidence, schemaDigest, type Target, type Evidence } from './database.ts';
import { blocked } from './manifest.ts';
import { fileDigest, privatePath } from './private-files.ts';
import { applyOnlyApproved } from './apply.ts';

function dumpFile(target: Target, command: string, args: string[], path: string) {
  const fd = openSync(privatePath(path), 'wx', 0o600);
  try {
    execFileSync('docker', pgArgs(target, command, args),
      { stdio: ['ignore', fd, 'pipe'], env: systemEnvironment(), timeout: 180000 });
    fsyncSync(fd);
  } finally { closeSync(fd); }
}
export function backupDatabase(target: Target, directory: string) {
  // stdout goes directly to private files: never decode a custom archive as text.
  dumpFile(target, 'pg_dumpall', ['--globals-only', '-l', 'postgres'], `${directory}/globals.sql`);
  dumpFile(target, 'pg_dump', ['-d', 'postgres', '--format=custom'], `${directory}/postgres.dump`);
  return { database: fileDigest(`${directory}/postgres.dump`), globals: fileDigest(`${directory}/globals.sql`) };
}
export function validateDisposable(container: string) {
  const [row] = JSON.parse(docker(['inspect', container]));
  if (row?.Name !== '/' + container || !/^delivery-migration-restore-[0-9a-f-]{36}$/.test(container)
    || row.Config.Labels['delivery.test'] !== 'stripe-migration-restore'
    || row.HostConfig.NetworkMode !== 'none' || row.Mounts.length !== 0
    || Object.keys(row.HostConfig.PortBindings ?? {}).length !== 0
    || row.HostConfig.Privileged || row.Config.User !== 'postgres') blocked('DISPOSABLE_IDENTITY_MISMATCH');
}
export async function disposableCluster<T>(image: string, task: (target: Target) => Promise<T> | T,
  owner: 'migration_restore' | 'migration_fixture_owner' = 'migration_restore'): Promise<T> {
  if (!/^sha256:[0-9a-f]{64}$/.test(image)) blocked('IMAGE_IDENTITY_MISMATCH');
  const name = `delivery-migration-restore-${randomUUID()}`;
  let created = false;
  try {
    docker(['run', '-d', '--rm', '--network', 'none', '--name', name, '--label', 'delivery.test=stripe-migration-restore',
      '--user', 'postgres', '--entrypoint', 'bash', image, '-c',
      `initdb -D /tmp/migration-pg --auth=trust -U ${owner} > /tmp/init.log && exec postgres -D /tmp/migration-pg -k /tmp`]);
    created = true;
    validateDisposable(name);
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      try { docker(['exec', name, 'pg_isready', '-h', '/tmp', '-U', owner]); ready = true; break; }
      catch { await setTimeout(500); }
    }
    if (!ready) blocked('RESTORE_DATABASE_UNAVAILABLE');
    return await task({ container: name, user: owner, socket: '/tmp' });
  } finally {
    if (created) { validateDisposable(name); docker(['stop', name]); }
  }
}
export function restoreDatabase(target: Target, directory: string) {
  validateDisposable(target.container);
  execFileSync('docker', pgArgs(target, 'psql', ['-X', '-q', '-d', 'template1', '-v', 'ON_ERROR_STOP=1'], false),
    { input: readFileSync(privatePath(`${directory}/globals.sql`)), stdio: ['pipe', 'pipe', 'pipe'], env: systemEnvironment(), timeout: 120000 });
  // Only our verified, portless disposable cluster. Never a configurable host/DSN.
  execFileSync('docker', pgArgs(target, 'psql', ['-X', '-q', '-d', 'template1', '-v', 'ON_ERROR_STOP=1'], false),
    { input: 'DROP DATABASE postgres;', stdio: ['pipe', 'pipe', 'pipe'], env: systemEnvironment(), timeout: 120000 });
  execFileSync('docker', pgArgs(target, 'pg_restore', ['--exit-on-error', '--create', '-d', 'template1'], false),
    { input: readFileSync(privatePath(`${directory}/postgres.dump`)), stdio: ['pipe', 'pipe', 'pipe'], env: systemEnvironment(), timeout: 180000 });
}
export async function testRestore(image: string, directory: string, before: Evidence, schema: string) {
  return disposableCluster(image, (target) => {
    restoreDatabase(target, directory);
    sameEvidence(before, snapshot(target));
    if (schemaDigest(target) !== schema) blocked('RESTORE_SCHEMA_MISMATCH');
    if (sql(target, `SELECT count(*) FROM local_control."Environment"`) !== '1') blocked('RESTORE_MARKER_MISMATCH');
    const after = applyOnlyApproved({ ...target, user: 'postgres' }, before);
    return { restored: true as const, isolated: true as const, migrationTested: true as const, after };
  });
}
