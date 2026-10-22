import { inspect, sanitized, prepare, apply, verifyBackup } from './stripe-migration/procedure.ts';
import { MigrationProcedureFailure } from './stripe-migration/manifest.ts';

try {
  const args = process.argv.slice(2);
  let result;
  if (args.length === 1 && args[0] === '--inspect') result = sanitized((await inspect()).before);
  else if (args.length === 1 && args[0] === '--prepare') result = await prepare();
  else if (args.length === 3 && args[0] === '--apply' && args[1] && args[2]) result = await apply(args[1], args[2]);
  else if (args.length === 3 && args[0] === '--verify-backup' && args[1] && args[2]) result = await verifyBackup(args[1], args[2]);
  else throw new Error();
  console.log(JSON.stringify(result));
} catch (error) {
  // Never interpolate PostgreSQL/Docker errors, SQL, paths, environment or archive content.
  const reason = error instanceof MigrationProcedureFailure ? error.message : 'LOCAL_PREFLIGHT_FAILED';
  console.error(`MIGRATION_PROCEDURE_BLOCKED (${reason}): detener; no reintentar una aplicación incierta. SOLICITUDES_STRIPE=0`);
  process.exitCode = 1;
}
