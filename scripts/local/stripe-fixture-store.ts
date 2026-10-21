import { randomUUID } from 'node:crypto';
import { Prisma, type PrismaClient } from '@prisma/client';
import { StripeFixtureFailure } from './stripe-fixture-environment.ts';

export interface StripeFixtureIdentity {
  readonly subjectId: string;
  readonly branchId: string;
  readonly merchantId: string;
}
export type StripeFixtureMode = 'dry-run' | 'create';
export interface StripeFixtureResult {
  readonly result: 'CREADO' | 'REUTILIZADO' | 'LISTO_PARA_CREAR';
  readonly scenarioId: string | null;
}

export async function assertStripeFixtureRole(tx: Prisma.TransactionClient) {
  const [role] = await tx.$queryRaw<{ safe: boolean }[]>`
    SELECT current_user = 'postgres' AND session_user = 'postgres' AND current_database() = 'postgres'
      AND rolbypassrls AND has_table_privilege(current_user, 'app."StripeSandboxScenario"', 'SELECT')
      AND has_table_privilege(current_user, 'app."StripeSandboxScenario"', 'INSERT')
      AND has_table_privilege(current_user, 'auth.users', 'SELECT') AS safe
    FROM pg_roles WHERE rolname = current_user`;
  if (!role?.safe) throw new StripeFixtureFailure('AUTHORIZATION_DENIED');
}

export async function readStripeFixtureIdentity(tx: Prisma.TransactionClient, mode: StripeFixtureMode): Promise<StripeFixtureIdentity> {
  const rows = await tx.$queryRaw<StripeFixtureIdentity[]>(Prisma.sql`
    SELECT m."subjectId", m."branchId", m."merchantId"
    FROM app."Membership" m JOIN app."Branch" b ON b.id = m."branchId" AND b."merchantId" = m."merchantId"
    JOIN app."Merchant" c ON c.id = m."merchantId" JOIN auth.users u ON u.id = m."subjectId"
    WHERE m.id = 'membership_synthetic_a' AND m."branchId" = 'branch_synthetic_a'
      AND m."merchantId" = 'merchant_synthetic_a' AND m.enabled AND b.enabled AND c.enabled
      AND u.email = 'merchant-a@example.test' AND u.deleted_at IS NULL
    ${mode === 'create' ? Prisma.sql`FOR SHARE OF m, b, c, u` : Prisma.empty}`);
  if (rows.length !== 1) throw new StripeFixtureFailure('AUTHORIZATION_DENIED');
  const identity = rows[0];
  if (!identity) throw new StripeFixtureFailure('AUTHORIZATION_DENIED');
  return identity;
}

/** Transaction-local core; production binding comes exclusively from readStripeFixtureIdentity. */
export async function prepareStripeFixtureScenario(tx: Prisma.TransactionClient, identity: StripeFixtureIdentity,
  accountId: string, mode: StripeFixtureMode): Promise<StripeFixtureResult> {
  // Branch scope deliberately ignores account/amount/owner: changing them must not bypass old history.
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`stripe-fixture:${identity.branchId}`}, 0))::text`;
  if (mode === 'create') {
    // Blocks runtime submission FK insertion until inspection/reuse commits; never locks during external I/O.
    await tx.$queryRaw`SELECT id FROM app."StripeSandboxScenario" WHERE "branchId" = ${identity.branchId} FOR UPDATE`;
  }
  const scenarios = await tx.stripeSandboxScenario.findMany({ where: { branchId: identity.branchId }, take: 2,
    include: { submission: true } });
  if (scenarios.some((scenario) => scenario.submission !== null)) throw new StripeFixtureFailure('HISTORY_BLOCKED');
  if (scenarios.length > 1) throw new StripeFixtureFailure('SCENARIO_CONFLICT');
  const scenario = scenarios[0];
  if (scenario) {
    if (!scenario.enabled || scenario.accountId !== accountId || scenario.subjectId !== identity.subjectId
      || scenario.merchantId !== identity.merchantId || scenario.amountMinor !== 4400
      || scenario.currency !== 'MXN' || scenario.purpose !== 'offline-test') throw new StripeFixtureFailure('SCENARIO_CONFLICT');
    return { result: 'REUTILIZADO', scenarioId: scenario.id };
  }
  if (mode === 'dry-run') return { result: 'LISTO_PARA_CREAR', scenarioId: null };
  const created = await tx.stripeSandboxScenario.create({ data: { id: randomUUID(), ...identity,
    accountId, amountMinor: 4400, currency: 'MXN', purpose: 'offline-test', enabled: true } });
  return { result: 'CREADO', scenarioId: created.id };
}

export async function prepareStripeFixture(db: PrismaClient, accountId: string, mode: StripeFixtureMode): Promise<StripeFixtureResult> {
  try {
    return await db.$transaction(async (tx) => {
      if (mode === 'dry-run') await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      await assertStripeFixtureRole(tx);
      const identity = await readStripeFixtureIdentity(tx, mode);
      return prepareStripeFixtureScenario(tx, identity, accountId, mode);
    }, { isolationLevel: 'ReadCommitted', timeout: 10000, maxWait: 5000 });
  } catch (error) {
    if (error instanceof StripeFixtureFailure) throw error;
    throw new StripeFixtureFailure('INFRASTRUCTURE_UNAVAILABLE');
  }
}

export function stripeFixtureOutput(value: StripeFixtureResult) {
  return `RESULTADO=${value.result}\nESCENARIO_UUID=${value.scenarioId ?? 'NO_CREADO'}\nIMPORTE=44.00 MXN\nSOLICITUDES_A_STRIPE=0`;
}
