import { createDatabase } from '../../../apps/api/src/infrastructure/database.ts';
import { parseStripeFixtureEnvironment } from '../stripe-fixture-environment.ts';
import { readPrivateEnv, fail } from './files.ts';

export interface HistoricalEvidence { readonly fingerprint: string; readonly scenarios: number; readonly submissions: number; readonly events: number }
export function legacySettings() {
  const file = readPrivateEnv('.env.local');
  parseStripeFixtureEnvironment(['LOCAL_SYNTHETIC_MODE', 'SUPABASE_URL', 'MIGRATION_DATABASE_URL', 'STRIPE_SANDBOX_ACCOUNT_ID']
    .map((key) => `${key}=${file[key] ?? ''}`).join('\n'));
  if (!file.MIGRATION_DATABASE_URL || !file.STRIPE_SANDBOX_ACCOUNT_ID || !file.STRIPE_SANDBOX_API_KEY) fail();
  return file;
}
export async function historicalEvidence(): Promise<HistoricalEvidence> {
  const file = legacySettings();
  const db = createDatabase(file.MIGRATION_DATABASE_URL ?? '');
  try {
    return await db.$transaction(async (tx) => {
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      const [row] = await tx.$queryRaw<HistoricalEvidence[]>`
        SELECT md5(concat(
          (SELECT string_agg(md5(to_jsonb(s)::text), '' ORDER BY id) FROM app."StripeSandboxScenario" s), '|',
          (SELECT string_agg(md5(to_jsonb(p)::text), '' ORDER BY "scenarioId") FROM app."StripeSandboxSubmission" p), '|',
          (SELECT string_agg(md5(to_jsonb(e)::text), '' ORDER BY "accountId", "eventId") FROM app."StripeSandboxEvent" e)
        )) AS fingerprint,
        (SELECT count(*)::int FROM app."StripeSandboxScenario" WHERE "branchId" = 'branch_synthetic_a') AS scenarios,
        (SELECT count(*)::int FROM app."StripeSandboxSubmission" p JOIN app."StripeSandboxScenario" s ON s.id = p."scenarioId"
          WHERE s."branchId" = 'branch_synthetic_a') AS submissions,
        (SELECT count(*)::int FROM app."StripeSandboxEvent" e JOIN app."StripeSandboxScenario" s ON s.id = e."scenarioId"
          WHERE s."branchId" = 'branch_synthetic_a') AS events`;
      if (!row || row.scenarios !== 148 || row.submissions !== 127 || row.events !== 51) fail();
      return row;
    }, { isolationLevel: 'RepeatableRead' });
  } finally { await db.$disconnect(); }
}
export function assertHistoricalEvidence(expected: HistoricalEvidence, actual: HistoricalEvidence) {
  if (expected.fingerprint !== actual.fingerprint || expected.scenarios !== actual.scenarios
    || expected.submissions !== actual.submissions || expected.events !== actual.events) fail();
}
