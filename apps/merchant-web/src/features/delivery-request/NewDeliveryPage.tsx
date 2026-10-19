import { Stepper, toast, type Step } from '@delivery/ui-web';
import { useEffect, useRef, useState } from 'react';
import { locationSource } from '../../geo/location-source.ts';
import { useSession } from '../../session/useSession.ts';
import { PageHeader } from '../../shared/PageHeader.tsx';
import type { BranchOption } from '../../workspace/WorkspaceProvider.tsx';
import { useWorkspace } from '../../workspace/useWorkspace.ts';
import { DestinationStep } from './DestinationStep.tsx';
import { DoneStep } from './DoneStep.tsx';
import { OriginStep } from './OriginStep.tsx';
import { QuoteStep } from './QuoteStep.tsx';
import { REQUEST_STEPS, useDeliveryRequest } from './useDeliveryRequest.ts';
import { usePickupLocation } from './usePickupLocation.ts';

const STEPS: readonly Step[] = [
  { id: 'origin', label: 'Origen' },
  { id: 'destination', label: 'Destino' },
  { id: 'quote', label: 'Cotización' },
  { id: 'done', label: 'Confirmación' },
];

function DeliveryRequestFlow({ branches, initialBranch, onRestart }: { branches: readonly BranchOption[]; initialBranch: BranchOption; onRestart: () => void }) {
  const { api } = useSession();
  const locations = locationSource();
  const request = useDeliveryRequest({ api, locations, initialBranchId: initialBranch.branchId });
  const branch = branches.find((option) => option.branchId === request.branchId) ?? initialBranch;
  const pickup = usePickupLocation(api, request.branchId);
  const requote = () => void request.requestQuote(pickup.status === 'ready' ? pickup.data : null);
  const index = REQUEST_STEPS.indexOf(request.step);
  const shownStep = useRef(request.step);

  // Each new step starts at the top and moves keyboard and screen-reader focus to its heading.
  useEffect(() => {
    if (shownStep.current === request.step) return;
    shownStep.current = request.step;
    globalThis.scrollTo({ top: 0 });
    document.getElementById('step-title')?.focus();
    if (request.step === 'done') toast({ title: 'Envío solicitado', description: 'La dirección de prueba quedó guardada con el envío.', tone: 'success' });
  }, [request.step]);

  return (
    <div className="flex flex-col gap-8">
      <Stepper steps={STEPS} currentIndex={index} aria-label="Solicitud de envío" />
      {request.step === 'origin' && <OriginStep request={request} branches={branches} />}
      {request.step === 'destination' && <DestinationStep request={request} locations={locations} pickup={pickup} branchName={branch.branchName} />}
      {request.step === 'quote' && <QuoteStep request={request} branchName={branch.branchName} onRequote={requote} />}
      {request.step === 'done' && request.delivery && <DoneStep delivery={request.delivery} onRestart={onRestart} />}
    </div>
  );
}

export function NewDeliveryPage() {
  const { branches, currentBranch } = useWorkspace();
  // Remounting the flow is the simplest complete reset for «Solicitar otro».
  const [run, setRun] = useState(0);
  if (!currentBranch) return null;
  return (
    <>
      <PageHeader overline={currentBranch.branchName} title="Nuevo envío" description="Cuatro pasos: origen, destino, cotización y confirmación." />
      <DeliveryRequestFlow key={run} branches={branches} initialBranch={currentBranch} onRestart={() => setRun((value) => value + 1)} />
    </>
  );
}
