import { manualInspect, manualPropose, manualExecute, manualPlan } from './stripe-manual-recovery/operations.ts';
import { guardManualRecoveryProcess } from './stripe-manual-recovery/environment.ts';
import { RecoveryFailure } from '../../apps/api/src/infrastructure/stripe-test/recovery-contract.ts';

try {
  guardManualRecoveryProcess();
  const [mode,arg,digest,...extra] = process.argv.slice(2);
  let result;
  if (extra.length) throw new RecoveryFailure('RECOVERY_REJECTED');
  if (mode === '--inspect' && !arg && !digest) result = await manualInspect();
  else if (mode === '--propose' && arg && !digest) result = await manualPropose(arg);
  else if (mode === '--execute' && arg && digest) result = await manualExecute(arg,digest);
  else if (mode === '--plan' && arg && !digest) result = await manualPlan(arg);
  else throw new RecoveryFailure('RECOVERY_REJECTED');
  console.log(JSON.stringify(result));
} catch (error) {
  console.error(JSON.stringify({blocked:error instanceof RecoveryFailure?error.code:'RECOVERY_UNAVAILABLE',
    instruction:'Detener; conservar expediente y marca de operación. No reintentar automáticamente.',financialEligibility:false,stripeRequests:0}));
  process.exitCode=1;
}
