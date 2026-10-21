import type { PrismaClient } from '@prisma/client';
import { StripeFixtureFailure } from './stripe-fixture-environment.ts';
import { assertStripeFixtureRole } from './stripe-fixture-store.ts';

export interface StripeHistoryGroup {
  readonly accountClass: 'configured-sandbox-unverified' | 'offline-fixture-label' | 'offline-tooling-label' | 'other-unverified';
  readonly state: string;
  readonly adverse: string;
  readonly scenarios: number;
  readonly submissions: number;
  readonly withKey: number;
  readonly withHash: number;
  readonly withStartedAt: number;
  readonly withSession: number;
  readonly withPaymentIntent: number;
  readonly withCharge: number;
  readonly matchingOfflineBindings: number;
  readonly events: number;
}

export function summarizeStripeHistory(input: readonly StripeHistoryGroup[], eventStates: readonly { state: string; events: number }[] = []) {
  const states = ['no-submission', 'pending', 'unknown', 'failed', 'capture_pending', 'captured_test', 'expired', 'refunded', 'disputed'];
  const classes = ['configured-sandbox-unverified', 'offline-fixture-label', 'offline-tooling-label', 'other-unverified'];
  if (input.some((row) => !states.includes(row.state) || !classes.includes(row.accountClass)
    || !['none', 'refunded', 'disputed'].includes(row.adverse))
    || eventStates.some((row) => !states.includes(row.state))) throw new StripeFixtureFailure('INFRASTRUCTURE_UNAVAILABLE');
  // Reconstruct the public shape, even if a future query accidentally adds private columns.
  const groups = input.map((row) => ({
    accountClass: row.accountClass, state: row.state, adverse: row.adverse,
    scenarios: row.scenarios, submissions: row.submissions, withKey: row.withKey, withHash: row.withHash,
    withStartedAt: row.withStartedAt, withSession: row.withSession, withPaymentIntent: row.withPaymentIntent,
    withCharge: row.withCharge, matchingOfflineBindings: row.matchingOfflineBindings, events: row.events,
  }));
  const sum = (field: 'scenarios' | 'submissions' | 'events') => groups.reduce((n, group) => n + group[field], 0);
  const scenarios = sum('scenarios'), submissions = sum('submissions');
  return {
    scope: 'manual-synthetic-branch', readOnly: true, scenarios, submissions, events: sum('events'), groups,
    eventStates: eventStates.map((row) => ({ state: row.state, events: row.events })),
    accountClasses: Object.fromEntries(['configured-sandbox-unverified', 'offline-fixture-label', 'offline-tooling-label', 'other-unverified']
      .map((name) => [name, groups.filter((group) => group.accountClass === name).reduce((n, group) => n + group.scenarios, 0)])),
    blockers: [
      ...(submissions ? [{ reason: 'SUBMISSION_EXISTS_EVEN_WITHOUT_KEY', count: submissions }] : []),
      ...(scenarios > 1 ? [{ reason: 'MULTIPLE_SCENARIOS', count: scenarios }] : []),
    ],
    provenance: 'NOT_RECORDED', externalRequestsFromDatabase: 'INDETERMINATE',
    explanation: 'Las etiquetas y bindings compatibles con fixtures no certifican ausencia de tráfico externo; ningún registro se excluye del bloqueo.',
    stripeRequestsByInspection: 0, operationalEligibility: false,
  } as const;
}

/** Only aggregates/booleans leave SQL: no identifiers, hashes, credentials, timestamps or request bodies. */
export async function inspectStripeHistory(db: PrismaClient, configuredAccount: string) {
  try {
    return await db.$transaction(async (tx) => {
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      await assertStripeFixtureRole(tx);
      const groups = await tx.$queryRaw<StripeHistoryGroup[]>`
        WITH evidence AS (
          SELECT CASE WHEN s."accountId" = ${configuredAccount} THEN 'configured-sandbox-unverified'
            WHEN s."accountId" = 'acct_offline' THEN 'offline-fixture-label'
            WHEN s."accountId" = 'acct_fixture' THEN 'offline-tooling-label'
            ELSE 'other-unverified' END AS "accountClass",
            coalesce(p.state, 'no-submission') AS state, coalesce(p.adverse, 'none') AS adverse,
            p."scenarioId" IS NOT NULL AS submitted, p.key IS NOT NULL AS keyed,
            p.hash IS NOT NULL AS hashed, p."startedAt" IS NOT NULL AS started,
            p."sessionId" IS NOT NULL AS session, p."paymentId" IS NOT NULL AS payment,
            p."chargeId" IS NOT NULL AS charge,
            (p."sessionId" ~ '^cs_test_[0-9a-f]{32}$'
              AND (p."paymentId" IS NULL OR p."paymentId" = replace(p."sessionId", 'cs_test_', 'pi_'))
              AND (p."chargeId" IS NULL OR p."chargeId" = replace(p."sessionId", 'cs_test_', 'ch_'))) AS matching,
            (SELECT count(*) FROM app."StripeSandboxEvent" e WHERE e."scenarioId" = s.id) AS events
          FROM app."StripeSandboxScenario" s LEFT JOIN app."StripeSandboxSubmission" p ON p."scenarioId" = s.id
          WHERE s."branchId" = 'branch_synthetic_a'
        ) SELECT "accountClass", state, adverse, count(*)::int AS scenarios,
          count(*) FILTER (WHERE submitted)::int AS submissions,
          count(*) FILTER (WHERE keyed)::int AS "withKey", count(*) FILTER (WHERE hashed)::int AS "withHash",
          count(*) FILTER (WHERE started)::int AS "withStartedAt", count(*) FILTER (WHERE session)::int AS "withSession",
          count(*) FILTER (WHERE payment)::int AS "withPaymentIntent", count(*) FILTER (WHERE charge)::int AS "withCharge",
          count(*) FILTER (WHERE matching)::int AS "matchingOfflineBindings", sum(events)::int AS events
        FROM evidence GROUP BY "accountClass", state, adverse ORDER BY "accountClass", state, adverse`;
      const eventStates = await tx.$queryRaw<{ state: string; events: number }[]>`
        SELECT e.state, count(*)::int AS events FROM app."StripeSandboxEvent" e
        JOIN app."StripeSandboxScenario" s ON s.id = e."scenarioId"
        WHERE s."branchId" = 'branch_synthetic_a' GROUP BY e.state ORDER BY e.state`;
      return summarizeStripeHistory(groups, eventStates);
    }, { isolationLevel: 'RepeatableRead', timeout: 10000 });
  } catch (error) {
    if (error instanceof StripeFixtureFailure) throw error;
    throw new StripeFixtureFailure('INFRASTRUCTURE_UNAVAILABLE');
  }
}
