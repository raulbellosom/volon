import { record } from '../../../apps/api/src/infrastructure/stripe-test/config.ts';
import { rejectRecovery } from '../../../apps/api/src/infrastructure/stripe-test/recovery-contract.ts';
import type { ManualRecoveryProposal } from '../../../apps/api/src/infrastructure/stripe-test/manual-recovery-contract.ts';

export function validateManualAuthorization(value: unknown, proposal: ManualRecoveryProposal, digest: string, now = Date.now()) {
  const fields = ['version','operation','operationId','authorized','head','proposalSha256','expiresAt'];
  if (!record(value) || Object.keys(value).length !== fields.length || fields.some((key) => !Object.hasOwn(value,key))
    || value.version !== 1 || value.operation !== 'manual-recovery-1-decision-1-successor' || value.operationId !== proposal.operationId
    || value.authorized !== true || value.head !== proposal.revision || value.proposalSha256 !== digest
    || typeof value.expiresAt !== 'string' || !Number.isFinite(Date.parse(value.expiresAt))) rejectRecovery();
  const expiry = Date.parse(value.expiresAt);
  if (!Number.isFinite(now) || expiry <= now || expiry > now+3600000 || expiry > Date.parse(proposal.expiresAt)) rejectRecovery();
}
