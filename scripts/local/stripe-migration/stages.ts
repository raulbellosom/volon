import { MigrationProcedureFailure } from './manifest.ts';

export type MigrationStage = 'CHECKOUT' | 'INSTANCE' | 'MIGRATION_HISTORY' | 'SOURCE_SNAPSHOT'
  | 'SOURCE_SCHEMA' | 'PRIVATE_DIRECTORY' | 'BACKUP_GLOBALS' | 'BACKUP_DATABASE' | 'BACKUP_DIGEST'
  | 'SOURCE_RECHECK' | 'DISPOSABLE_START' | 'RESTORE_GLOBALS' | 'RESTORE_DATABASE'
  | 'RESTORE_FINGERPRINT' | 'RESTORE_SCHEMA' | 'RESTORE_MARKER' | 'DISPOSABLE_MIGRATION'
  | 'DISPOSABLE_CLEANUP' | 'FINAL_RECHECK' | 'PREFLIGHT_WRITE';

export class MigrationStageFailure extends MigrationProcedureFailure {
  readonly stage: MigrationStage;
  constructor(stage: MigrationStage, error: unknown) {
    // Do not retain the original error: child-process errors include arguments,
    // private paths, SQL, stdout/stderr and possibly role passwords.
    super(error instanceof MigrationProcedureFailure ? error.message : 'LOCAL_STEP_FAILED');
    this.stage = stage;
  }
}
function failure(stage: MigrationStage, error: unknown) {
  return error instanceof MigrationStageFailure ? error : new MigrationStageFailure(stage, error);
}
export function migrationStep<T>(stage: MigrationStage, task: () => T): T {
  try { return task(); } catch (error) { throw failure(stage, error); }
}
export async function migrationTask<T>(stage: MigrationStage, task: () => Promise<T>): Promise<T> {
  try { return await task(); } catch (error) { throw failure(stage, error); }
}
export function migrationFailureMessage(error: unknown) {
  const reason = error instanceof MigrationProcedureFailure ? error.message : 'LOCAL_PREFLIGHT_FAILED';
  const stage = error instanceof MigrationStageFailure ? `STAGE=${error.stage}; ` : '';
  return `MIGRATION_PROCEDURE_BLOCKED (${stage}${reason}): detener; no reintentar una aplicación incierta. SOLICITUDES_STRIPE=0`;
}
