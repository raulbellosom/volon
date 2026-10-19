import { EmptyState, LinkButton } from '@delivery/ui-web';
import { PackageOpen, PackagePlus } from 'lucide-react';
import { PageHeader } from '../../shared/PageHeader.tsx';
import { useWorkspace } from '../../workspace/useWorkspace.ts';
import { DeliveryLookup } from './DeliveryLookup.tsx';

const SECTION_TITLE = 'text-lg font-bold text-text-primary';

export function HomePage() {
  const { currentBranch } = useWorkspace();
  return (
    <>
      <PageHeader
        overline={currentBranch ? `${currentBranch.merchantName} · ${currentBranch.branchName}` : undefined}
        title="Envíos de tu sucursal"
        description="Solicita una entrega local, revisa el precio antes de confirmar y consulta su estado."
        actions={<LinkButton href="/envios/nuevo" variant="primary" size="lg" leadingIcon={<PackagePlus />}>Nuevo envío</LinkButton>}
      />

      <section aria-labelledby="recent-title" className="flex flex-col gap-4">
        <h2 id="recent-title" className={SECTION_TITLE}>Envíos recientes</h2>
        <div className="rounded-xl border border-dashed border-border">
          <EmptyState
            icon={<PackageOpen />}
            title="Aquí verás los envíos de tu sucursal"
            description="El historial por sucursal todavía no está disponible. Mientras tanto, consulta cualquier envío con su folio."
            actions={<LinkButton href="/envios/nuevo" variant="secondary" leadingIcon={<PackagePlus />}>Solicitar el primero</LinkButton>}
          />
        </div>
      </section>

      <section aria-labelledby="lookup-title" className="flex flex-col gap-4 border-t border-border-subtle pt-8">
        <div className="flex flex-col gap-1">
          <h2 id="lookup-title" className={SECTION_TITLE}>Consultar un envío</h2>
          <p className="text-sm text-text-secondary">Escribe el folio para ver en qué va.</p>
        </div>
        <DeliveryLookup />
      </section>
    </>
  );
}
