import { Button, RadioCard, RadioGroup } from '@delivery/ui-web';
import { ArrowRight, Store } from 'lucide-react';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { PageHeader } from '../../shared/PageHeader.tsx';
import { useWorkspace } from '../../workspace/useWorkspace.ts';

function returnPath(state: unknown): string {
  if (typeof state === 'object' && state !== null && 'from' in state && typeof state.from === 'string' && state.from.startsWith('/')) {
    return state.from === '/sucursal' ? '/' : state.from;
  }
  return '/';
}

/** Choose which branch the panel works for; every request is scoped to it. */
export function BranchSelectPage() {
  const { branches, currentBranch, selectBranch } = useWorkspace();
  const navigate = useNavigate();
  const { state } = useLocation();
  const [choice, setChoice] = useState<string>(currentBranch?.branchId ?? '');

  function confirm() {
    if (!choice) return;
    selectBranch(choice);
    void navigate(returnPath(state), { replace: true });
  }

  return (
    <>
      <PageHeader
        title="¿Desde qué sucursal trabajas?"
        description="Los envíos que solicites saldrán de esta sucursal. Puedes cambiarla cuando quieras desde el menú de tu cuenta."
      />
      <RadioGroup aria-label="Sucursales disponibles" layout="cards" value={choice} onChange={setChoice}>
        {branches.map((branch) => (
          <RadioCard
            key={branch.branchId}
            value={branch.branchId}
            icon={<Store />}
            title={branch.branchName}
            description={branch.merchantName}
          />
        ))}
      </RadioGroup>
      <div className="flex justify-end">
        <Button size="lg" isDisabled={!choice} trailingIcon={<ArrowRight />} onPress={confirm}>
          Continuar
        </Button>
      </div>
    </>
  );
}
