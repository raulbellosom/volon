import { EmptyState, LinkButton, Logo } from '@delivery/ui-web';
import { House, SignpostBig } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-background px-4 text-text-primary">
      <Logo size="sm" />
      <main>
        <h1 className="sr-only">Página no encontrada</h1>
        <EmptyState
          icon={<SignpostBig />}
          title="Esta página no existe"
          description="Puede que el enlace esté incompleto o que la página haya cambiado de lugar."
          actions={<LinkButton href="/" variant="primary" leadingIcon={<House />}>Ir al inicio</LinkButton>}
        />
      </main>
    </div>
  );
}
