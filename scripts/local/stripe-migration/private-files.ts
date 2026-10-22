import { execFileSync } from 'node:child_process';
import { chmodSync, lstatSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { systemEnvironment, run } from '../stripe-manual/files.ts';
import { blocked, sha } from './manifest.ts';

export const backupRoot = '.local/stripe-manual/migration';
export const testBackupRoot = '.local/stripe-migration-tests';
export function privatePath(path: string) {
  const absolute = resolve(path);
  if (![resolve('.local/stripe-manual'),resolve(testBackupRoot)]
    .some((root) => absolute.startsWith(root + '/') || absolute.startsWith(root + '\\'))) blocked('PRIVATE_PATH_REJECTED');
  let cursor = absolute;
  while (cursor !== dirname(cursor)) {
    try {
      if (lstatSync(cursor).isSymbolicLink() || realpathSync(cursor).toLowerCase() !== resolve(cursor).toLowerCase())
        blocked('PRIVATE_PATH_REJECTED');
    } catch (error) {
      if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
    }
    cursor = dirname(cursor);
  }
  run('git', ['check-ignore', '--quiet', '--', path]);
  return absolute;
}
export function protectDirectory(path: string) {
  privatePath(path);
  mkdirSync(path, { recursive: true, mode: 0o700 });
  if (process.platform === 'win32') {
    const sid = run('whoami', ['/user', '/fo', 'csv', '/nh']).match(/S-1-5-\d+(?:-\d+)+/)?.[0];
    if (!sid) blocked('PRIVATE_ACL_UNAVAILABLE');
    execFileSync('icacls', [resolve(path), '/inheritance:r', '/grant:r', `*${sid}:(OI)(CI)F`, '*S-1-5-18:(OI)(CI)F'],
      { stdio: 'ignore', env: systemEnvironment() });
  } else chmodSync(path, 0o700);
}
export function writeJson(path: string, value: unknown) {
  privatePath(path);
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
}
export function fileDigest(path: string) { return sha(readFileSync(privatePath(path))); }
export function bundlePath(id: string, scope: 'manual' | 'test' = 'manual') {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id)) blocked('PREFLIGHT_ID_REJECTED');
  return privatePath(`${scope === 'manual' ? backupRoot : testBackupRoot}/${id}`);
}
