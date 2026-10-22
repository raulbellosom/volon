import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { createDatabase } from '../../apps/api/src/infrastructure/database.ts';
import { uuid } from '../../apps/api/src/modules/payments/payment.contract.ts';
import { RecoveryFailure, parseRecoveryEvidence } from '../../apps/api/src/infrastructure/stripe-test/recovery-contract.ts';
import { stripeTestHash } from '../../apps/api/src/infrastructure/stripe-test/checkout-parameters.ts';
import { inspectRecovery, prepareSuccessor, verifyRecoveryLab } from '../../apps/api/src/infrastructure/stripe-test/recovery-store.ts';
import { loadRecoveryPlan, recoveryPlanDigest } from '../../apps/api/src/infrastructure/stripe-test/recovery-plan.ts';
import { loadRecoveryLabEnvironment } from './stripe-recovery-environment.ts';
import { authenticateLocalSyntheticUser } from './stripe-synthetic-auth.ts';
import { readHiddenStripeValue } from './stripe-hidden-input.ts';
import { validateRecoveryArtifact } from '../../apps/api/src/infrastructure/stripe-test/recovery-artifact.ts';

async function main() {
  if (process.execArgv.some((arg) => arg !== '--experimental-strip-types')) throw new RecoveryFailure('RECOVERY_ENVIRONMENT_BLOCKED');
  const local = loadRecoveryLabEnvironment(process.env,!!process.stdin.isTTY && !!process.stdout.isTTY);
  const [mode,arg,...extra] = process.argv.slice(2);
  if (!arg || extra.length || !['--inspect','--prepare','--plan'].includes(mode ?? '')) throw new RecoveryFailure('RECOVERY_REJECTED');
  const head = execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
  const db = createDatabase(local.databaseUrl);
  try {
    await verifyRecoveryLab(db,local.instanceId);
    const actor = await authenticateLocalSyntheticUser('http://127.0.0.1:56321',local.publishableKey,local.password);
    if (mode === '--prepare') {
      const path = resolve(arg), directory = resolve('.local/stripe-recovery') + sep;
      if (!path.startsWith(directory)) throw new RecoveryFailure('RECOVERY_REJECTED');
      execFileSync('git',['check-ignore','--quiet','--',path],{stdio:'ignore'});
      const input = readFileSync(path,'utf8');
      if (Buffer.byteLength(input) > 16384) throw new RecoveryFailure('RECOVERY_REJECTED');
      const evidence = parseRecoveryEvidence(JSON.parse(input));
      validateRecoveryArtifact(readFileSync(resolve(directory,'stripe-error.json'),'utf8'),evidence);
      const digest = stripeTestHash(JSON.stringify(evidence));
      console.log(JSON.stringify({approvalSha256:digest,localWritesOnly:true,manualWritesEnabled:false,stripeRequests:0}));
      const approval = await readHiddenStripeValue('PREPARAR RECUPERACION OFFLINE y SHA-256 del expediente aprobado');
      if (approval !== 'PREPARAR RECUPERACION OFFLINE ' + digest) throw new RecoveryFailure('RECOVERY_REJECTED');
      console.log(JSON.stringify(await prepareSuccessor(db,actor,local.instanceId,evidence,head)));
    } else {
      if (!uuid.test(arg)) throw new RecoveryFailure('RECOVERY_REJECTED');
      if (mode === '--inspect') console.log(JSON.stringify(await inspectRecovery(db,actor,local.instanceId,arg)));
      else {
        const plan = await loadRecoveryPlan(db,actor,local.instanceId,arg,head,new Date(Date.now()+3600000).toISOString());
        mkdirSync('.local/stripe-recovery',{recursive:true});
        writeFileSync('.local/stripe-recovery/plan-v2.json',JSON.stringify(plan,null,2)+'\n',{mode:0o600});
        console.log(JSON.stringify({ sha256: recoveryPlanDigest(plan), readyForExternalCalls:false, stripeRequests:0, eligible:false }));
      }
    }
  } finally { await db.$disconnect(); }
}
main().catch((error: unknown) => {
  console.error(JSON.stringify({ blocked:error instanceof RecoveryFailure ? error.code : 'RECOVERY_UNAVAILABLE', stripeRequests:0, eligible:false }));
  process.exitCode = 1;
});
