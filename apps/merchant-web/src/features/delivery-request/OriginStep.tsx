import { Button, RadioCard, RadioGroup } from '@delivery/ui-web';
import { ArrowRight, Store } from 'lucide-react';
import type { BranchOption } from '../../workspace/WorkspaceProvider.tsx';
import type { DeliveryRequestState } from './useDeliveryRequest.ts';
import { StepActions, StepSection } from './StepSection.tsx';

export function OriginStep({ request, branches }: { request: DeliveryRequestState; branches: readonly BranchOption[] }) {
  return (
    <StepSection title="¿De dónde sale el envío?" description="El repartidor recogerá el paquete en esta sucursal.">
      <RadioGroup aria-label="Sucursal de recogida" layout="cards" value={request.branchId} onChange={request.setBranchId}>
        {branches.map((branch) => (
          <RadioCard key={branch.branchId} value={branch.branchId} icon={<Store />} title={branch.branchName} description={branch.merchantName} />
        ))}
      </RadioGroup>
      <StepActions>
        <Button size="lg" isDisabled={!request.branchId} trailingIcon={<ArrowRight />} onPress={() => request.setStep('destination')}>
          Continuar
        </Button>
      </StepActions>
    </StepSection>
  );
}
