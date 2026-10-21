import { createDatabase } from '../../apps/api/src/infrastructure/database.ts';
import { StripeFixtureFailure, stripeFixtureMode } from './stripe-fixture-environment.ts';
import { prepareStripeFixture, stripeFixtureOutput } from './stripe-fixture-store.ts';
import { guardManualProcess } from './stripe-manual/files.ts';
import { readManualSettings, verifyHistoricalPreservation } from './stripe-manual/settings.ts';
import { manualStatus } from './stripe-manual/status.ts';
import { verifyManualDatabase } from './stripe-manual/identity.ts';

async function main() {
  const mode = stripeFixtureMode(process.argv.slice(2));
  if (process.execArgv.some((arg) => arg !== '--experimental-strip-types')) throw new StripeFixtureFailure('CONFIGURATION_INVALID');
  try { guardManualProcess(); } catch { throw new StripeFixtureFailure('CONFIGURATION_INVALID'); }
  await manualStatus();
  const { file, services, provenance } = readManualSettings();
  const db = createDatabase(file.MIGRATION_DATABASE_URL ?? '');
  try {
    await verifyManualDatabase(db, services.instanceId, provenance.accountId);
    const result = await prepareStripeFixture(db, provenance.accountId, mode);
    await verifyHistoricalPreservation();
    console.log(stripeFixtureOutput(result));
  }
  finally { await db.$disconnect(); }
}
main().catch((error: unknown) => {
  const code = error instanceof StripeFixtureFailure ? error.code : 'INFRASTRUCTURE_UNAVAILABLE';
  const messages = {
    CONFIGURATION_INVALID: 'Configuración local inválida; revisa .env.stripe-manual.local privado y la instancia manual.',
    AUTHORIZATION_DENIED: 'Rol o identidad sintética no autorizados; verifica membresía y habilitación.',
    HISTORY_BLOCKED: 'Existe historial previo; detente y solicita revisión de recuperación en el Issue #26.',
    SCENARIO_CONFLICT: 'Escenarios múltiples o incompatibles; detente y solicita revisión, sin crear otro.',
    INFRASTRUCTURE_UNAVAILABLE: 'No se pudo confirmar la operación local; verifica el stack y ejecuta --dry-run.',
    INVALID_COMMAND: 'Usa pnpm stripe:sandbox:fixture --dry-run o --create.',
  };
  console.error(`BLOQUEADO=${code}: ${messages[code]}\nSOLICITUDES_A_STRIPE=0`);
  process.exitCode = 1;
});
