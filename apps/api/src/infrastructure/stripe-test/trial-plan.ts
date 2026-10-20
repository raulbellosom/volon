import { CheckoutTestFailure } from '../../modules/payments/checkout-sandbox.port.ts';
import { uuid } from '../../modules/payments/payment.contract.ts';
import { record, stripeId } from './config.ts';
import { stripeTestHash } from './checkout-parameters.ts';
import { STRIPE_TRIAL_RETURN_ORIGIN, type StripeHttpsScope } from './https-policy.ts';

export interface StripeTrialPlan extends StripeHttpsScope {
  readonly version: 1;
  readonly purpose: 'stripe-test-session-proposal';
  readonly revision: string;
  readonly subjectId: string;
  readonly branchId: string;
  readonly merchantId: string;
  readonly amountMinor: 4400;
  readonly currency: 'MXN';
  readonly returnOrigin: typeof STRIPE_TRIAL_RETURN_ORIGIN;
  readonly expiresAt: string;
  readonly maxRequests: 2 | 4;
  readonly maxSessions: 0 | 1;
}
const fields = ['version','purpose','revision','subjectId','branchId','merchantId','scenarioId','accountId',
  'amountMinor','currency','returnOrigin','operation','sessionId','paymentId','chargeId','expiresAt','maxRequests','maxSessions'];
export function validateStripeTrialPlan(value: unknown): StripeTrialPlan {
  const invalid = (): never => { throw new CheckoutTestFailure('INVALID_COMMAND'); };
  if (!record(value) || Object.keys(value).length !== fields.length || fields.some((f) => !Object.hasOwn(value, f))) return invalid();
  if (value.version !== 1 || value.purpose !== 'stripe-test-session-proposal' || typeof value.revision !== 'string'
    || !/^[0-9a-f]{40}$/.test(value.revision) || typeof value.subjectId !== 'string' || !uuid.test(value.subjectId)
    || typeof value.scenarioId !== 'string' || !uuid.test(value.scenarioId) || typeof value.branchId !== 'string'
    || !/^branch_synthetic_[ab]$/.test(value.branchId) || value.merchantId !== value.branchId.replace('branch_', 'merchant_')
    || !stripeId(value.accountId, 'acct_') || value.amountMinor !== 4400 || value.currency !== 'MXN'
    || value.returnOrigin !== STRIPE_TRIAL_RETURN_ORIGIN || (value.operation !== 'create' && value.operation !== 'reconcile')
    || typeof value.expiresAt !== 'string' || !Number.isFinite(Date.parse(value.expiresAt))) return invalid();
  if (new Date(value.expiresAt).toISOString() !== value.expiresAt) return invalid();
  for (const [field, prefix] of [['sessionId','cs_test_'],['paymentId','pi_'],['chargeId','ch_']] as const)
    if (value[field] !== null && !stripeId(value[field], prefix)) return invalid();
  if (value.maxRequests !== (value.operation === 'create' ? 2 : 4) || value.maxSessions !== (value.operation === 'create' ? 1 : 0)
    || (value.operation === 'create' && [value.sessionId,value.paymentId,value.chargeId].some((v) => v !== null))
    || (value.operation === 'reconcile' && !value.sessionId) || (value.chargeId && !value.paymentId)) return invalid();
  // Fixed property order makes approval hashes independent of incoming JSON property order.
  const canonical = Object.fromEntries(fields.map((f) => [f, value[f]]));
  return Object.freeze(canonical) as unknown as StripeTrialPlan;
}
export function stripeTrialDigest(plan: StripeTrialPlan): string {
  return stripeTestHash(JSON.stringify(validateStripeTrialPlan(plan)));
}
export function assertStripeTrialApproval(plan: StripeTrialPlan, confirmation: string, now = Date.now()) {
  const remaining = Date.parse(plan.expiresAt) - now;
  if (!Number.isFinite(now) || remaining <= 0 || remaining > 3600000
    || confirmation !== 'AUTORIZO STRIPE TEST ' + stripeTrialDigest(plan)) throw new CheckoutTestFailure('TRANSPORT_DISABLED');
}
