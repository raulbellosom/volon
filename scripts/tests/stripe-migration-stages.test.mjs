import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { statSync } from 'node:fs';
import { join } from 'node:path';
import { migrationStep, migrationTask, migrationFailureMessage } from '../local/stripe-migration/stages.ts';
import { blocked } from '../local/stripe-migration/manifest.ts';
import { bundlePath, protectDirectory, writeJson } from '../local/stripe-migration/private-files.ts';

test('stage errors discard private process details and preserve the innermost failure', async () => {
  const secret = 'PRIVATE_CANARY_password_token_SQL_path';
  const failure = Object.assign(new Error(secret), { stderr: secret, stdout: secret, path: secret });
  await assert.rejects(() => migrationTask('DISPOSABLE_START', async () => {
    migrationStep('RESTORE_GLOBALS', () => { throw failure; });
  }), (error) => {
    assert.equal(migrationFailureMessage(error), 'MIGRATION_PROCEDURE_BLOCKED (STAGE=RESTORE_GLOBALS; LOCAL_STEP_FAILED): detener; no reintentar una aplicación incierta. SOLICITUDES_STRIPE=0');
    assert.doesNotMatch(JSON.stringify(error), new RegExp(secret));
    assert.equal(error.cause, undefined);
    assert.equal(error.stderr, undefined);
    return true;
  });
  assert.doesNotMatch(migrationFailureMessage(failure), new RegExp(secret));
  assert.throws(() => migrationStep('SOURCE_RECHECK', () => blocked('DATABASE_FINGERPRINT_MISMATCH_TABLES')),
    (error) => /STAGE=SOURCE_RECHECK; DATABASE_FINGERPRINT_MISMATCH_TABLES/.test(migrationFailureMessage(error)));
});

test('private Windows/POSIX directories and exclusive writes stay protected', () => {
  const directory = bundlePath(randomUUID(), 'test');
  migrationStep('PRIVATE_DIRECTORY', () => protectDirectory(directory));
  if (process.platform === 'win32') {
    const path = directory.replaceAll("'", "''");
    const command = `$acl=Get-Acl -LiteralPath '${path}'; $sid=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value;
      $allowed=@($sid,'S-1-5-18'); $rules=@($acl.Access);
      [bool]($acl.AreAccessRulesProtected -and $rules.Count -eq 2 -and
        @($rules | Where-Object { $_.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value -notin $allowed -or
          $_.AccessControlType -ne 'Allow' -or $_.FileSystemRights -ne 'FullControl' -or $_.IsInherited }).Count -eq 0)`;
    const result = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
    assert.equal(result, 'True');
  } else assert.equal(statSync(directory).mode & 0o777, 0o700);
  const file = join(directory, 'synthetic.json');
  writeJson(file, { synthetic: true });
  assert.throws(() => migrationStep('PREFLIGHT_WRITE', () => writeJson(file, { replaced: true })),
    (error) => /STAGE=PREFLIGHT_WRITE; LOCAL_STEP_FAILED/.test(migrationFailureMessage(error)));
});
