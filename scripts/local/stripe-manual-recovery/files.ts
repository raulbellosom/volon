import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { uuid } from '../../../apps/api/src/modules/payments/payment.contract.ts';
import { RecoveryFailure } from '../../../apps/api/src/infrastructure/stripe-test/recovery-contract.ts';
import { privatePath, protectDirectory, writeJson } from '../stripe-migration/private-files.ts';

export const operationRoot = '.local/stripe-manual/recovery';
export function operationDirectory(id: string) {
  if (!uuid.test(id)) throw new RecoveryFailure('RECOVERY_REJECTED');
  return privatePath(join(operationRoot,id));
}
export function readLimited(path: string) {
  const text = readFileSync(privatePath(path),'utf8');
  if (Buffer.byteLength(text)>65536) throw new RecoveryFailure('RECOVERY_REJECTED');
  return text;
}
export function readDossier(directory: string) {
  privatePath(directory);
  return {evidence:JSON.parse(readLimited(join(directory,'evidence.json'))) as unknown,
    review:JSON.parse(readLimited(join(directory,'manual-review.json'))) as unknown,
    stripeError:readLimited(join(directory,'stripe-error.json')),historyReview:readLimited(join(directory,'stripe-history-review.txt'))};
}
export function saveProposal(id: string, proposal: unknown, dossierDirectory: string) {
  const path = operationDirectory(id);
  if (existsSync(path)) throw new RecoveryFailure('RECOVERY_CONFLICT');
  protectDirectory(path);
  writeJson(join(path,'proposal.json'),proposal);
  writeJson(join(path,'dossier-reference.json'),{directory:privatePath(dossierDirectory)});
}
export { writeJson };
