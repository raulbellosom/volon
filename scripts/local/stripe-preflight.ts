import { stripeSandboxPreflight } from '../../apps/api/src/infrastructure/stripe-test/preflight.ts';
try {
  console.log(JSON.stringify(stripeSandboxPreflight(process.env), null, 2));
} catch {
  console.error(JSON.stringify({ readyForExternalCalls: false, error: 'CONFIGURATION_INVALID' }));
  process.exitCode = 1;
}
