import { createDatabase } from '../../apps/api/src/infrastructure/database.ts';
import { loadStripeFixtureEnvironment, StripeFixtureFailure, stripeFixtureMode } from './stripe-fixture-environment.ts';
import { prepareStripeFixture, stripeFixtureOutput } from './stripe-fixture-store.ts';

async function main() {
  const mode = stripeFixtureMode(process.argv.slice(2));
  if (process.execArgv.some((arg) => arg !== '--experimental-strip-types')) throw new StripeFixtureFailure('CONFIGURATION_INVALID');
  const local = await loadStripeFixtureEnvironment(process.env);
  const db = createDatabase(local.databaseUrl);
  try { console.log(stripeFixtureOutput(await prepareStripeFixture(db, local.accountId, mode))); }
  finally { await db.$disconnect(); }
}
main().catch((error: unknown) => {
  const code = error instanceof StripeFixtureFailure ? error.code : 'INFRASTRUCTURE_UNAVAILABLE';
  const messages = {
    CONFIGURATION_INVALID: 'Configuración local inválida; revisa .env.local privado y el stack sintético.',
    AUTHORIZATION_DENIED: 'Rol o identidad sintética no autorizados; verifica membresía y habilitación.',
    HISTORY_BLOCKED: 'Existe historial previo; detente y solicita revisión de recuperación en el Issue #26.',
    SCENARIO_CONFLICT: 'Escenarios múltiples o incompatibles; detente y solicita revisión, sin crear otro.',
    INFRASTRUCTURE_UNAVAILABLE: 'No se pudo confirmar la operación local; verifica el stack y ejecuta --dry-run.',
    INVALID_COMMAND: 'Usa pnpm stripe:sandbox:fixture --dry-run o --create.',
  };
  console.error(`BLOQUEADO=${code}: ${messages[code]}\nSOLICITUDES_A_STRIPE=0`);
  process.exitCode = 1;
});
