import { LinkButton } from '@delivery/ui-web';
import { PackagePlus } from 'lucide-react';
import { PageHeader } from '../../shared/PageHeader.tsx';
import { useWorkspace } from '../../workspace/useWorkspace.ts';
import { DeliveryHistory } from './DeliveryHistory.tsx';
import { DeliveryLookup } from './DeliveryLookup.tsx';

const SECTION_TITLE = 'text-lg font-bold text-text-primary';

export function HomePage() {
  const { currentBranch, me } = useWorkspace();
  return (
    <>
      <PageHeader
        overline={currentBranch ? `${currentBranch.merchantName} · ${currentBranch.branchName}` : undefined}
        title="Envíos de tu sucursal"
        description="Solicita una entrega local, revisa el precio antes de confirmar y consulta su estado."
        actions={<LinkButton href="/envios/nuevo" variant="primary" size="lg" leadingIcon={<PackagePlus />}>Nuevo envío</LinkButton>}
      />

      {currentBranch && me.status === 'ready' && (
        <DeliveryHistory key={`${me.data.subjectId}:${currentBranch.branchId}`} branch={currentBranch} />
      )}

      <section aria-labelledby="lookup-title" className="flex flex-col gap-4 border-t border-border-subtle pt-8">
        <div className="flex flex-col gap-1">
          <h2 id="lookup-title" className={SECTION_TITLE}>Consultar un envío</h2>
          <p className="text-sm text-text-secondary">¿Tienes un folio a la mano? Escríbelo completo para abrir su estado.</p>
        </div>
        <DeliveryLookup />
      </section>
    </>
  );
}
