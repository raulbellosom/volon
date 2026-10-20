import type { PrismaClient } from '@prisma/client';
import type { PaymentActor } from '../../modules/payments/payment.contract.ts';
import { CheckoutTestFailure, type CheckoutSandboxStore, type SandboxCheckoutPort } from '../../modules/payments/checkout-sandbox.port.ts';
import { assertRuntimeRole, withSubject } from '../database.ts';
import { createPostgresCheckoutSandboxStore } from './postgres-store.ts';
import { validateStripeTrialPlan, type StripeTrialPlan } from './trial-plan.ts';
import { STRIPE_TRIAL_RETURN_ORIGIN } from './https-policy.ts';

export async function loadStripeTrialPlan(db: PrismaClient, actor: PaymentActor, scenarioId: string,
  operation: 'create' | 'reconcile', revision: string, expiresAt: string): Promise<StripeTrialPlan> {
  try {
    await assertRuntimeRole(db);
    return await withSubject(db, actor, async (tx) => {
      await tx.$queryRaw`SELECT set_config('app.stripe_sandbox','offline-test-v1',true)`;
      const scenario = await tx.stripeSandboxScenario.findUnique({ where: { id: scenarioId }, include: { submission: true } });
      if (!scenario) throw new CheckoutTestFailure('NOT_FOUND');
      if (operation === 'create' && scenario.submission?.key) throw new CheckoutTestFailure('REQUEST_UNKNOWN');
      return validateStripeTrialPlan({ version: 1, purpose: 'stripe-test-session-proposal', revision,
        subjectId: actor.subjectId, branchId: scenario.branchId, merchantId: scenario.merchantId, scenarioId,
        accountId: scenario.accountId, amountMinor: scenario.amountMinor, currency: scenario.currency,
        returnOrigin: STRIPE_TRIAL_RETURN_ORIGIN, operation, sessionId: scenario.submission?.sessionId ?? null,
        paymentId: scenario.submission?.paymentId ?? null, chargeId: scenario.submission?.chargeId ?? null,
        expiresAt, maxRequests: operation === 'create' ? 2 : 4, maxSessions: operation === 'create' ? 1 : 0 });
    });
  } catch (error) {
    if (error instanceof CheckoutTestFailure) throw error;
    throw new CheckoutTestFailure('INFRASTRUCTURE_UNAVAILABLE');
  }
}
/** First manual create cannot replay POST after any persisted submission, even across processes. */
export function firstStripeTrialStore(db: PrismaClient): CheckoutSandboxStore {
  const store = createPostgresCheckoutSandboxStore(db);
  return { save: store.save, reserve: async (...args) => {
    const lease = await store.reserve(...args);
    if (lease.fixture.submission) {
      await store.save(args[0], lease, true);
      throw new CheckoutTestFailure('REQUEST_UNKNOWN');
    }
    return lease;
  } };
}
export async function executeStripeTrial(plan: StripeTrialPlan, actor: PaymentActor, adapter: SandboxCheckoutPort) {
  if (actor.subjectId !== plan.subjectId) throw new CheckoutTestFailure('NOT_FOUND');
  return adapter[plan.operation](actor, { intentId: plan.scenarioId });
}
