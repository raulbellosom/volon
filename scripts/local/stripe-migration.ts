import { inspect, sanitized, prepare, apply, verifyBackup } from './stripe-migration/procedure.ts';
import { MigrationProcedureFailure, auditedProfile, migrationProfile } from './stripe-migration/manifest.ts';

try {
  let args = process.argv.slice(2);
  let profile = auditedProfile;
  if (args[0] === '--target' && args[1]) { profile=migrationProfile(args[1]); args=args.slice(2); }
  let result;
  if (args.length === 1 && args[0] === '--inspect') result = sanitized((await inspect(profile)).before,profile);
  else if (args.length === 1 && args[0] === '--prepare') result = await prepare(profile);
  else if (args.length === 3 && args[0] === '--apply' && args[1] && args[2]) result = await apply(args[1], args[2],profile);
  else if (args.length === 3 && args[0] === '--verify-backup' && args[1] && args[2]) result = await verifyBackup(args[1], args[2],profile);
  else throw new Error();
  console.log(JSON.stringify(result));
} catch (error) {
  // Never interpolate PostgreSQL/Docker errors, SQL, paths, environment or archive content.
  const reason = error instanceof MigrationProcedureFailure ? error.message : 'LOCAL_PREFLIGHT_FAILED';
  console.error(`MIGRATION_PROCEDURE_BLOCKED (${reason}): detener; no reintentar una aplicación incierta. SOLICITUDES_STRIPE=0`);
  process.exitCode = 1;
}
