import { Button, EmptyState } from '@delivery/ui-web';
import { LogOut, Store } from 'lucide-react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { useSession } from '../session/useSession.ts';
import { LoadingState } from '../shared/LoadingState.tsx';
import { ProblemState } from '../shared/ProblemState.tsx';
import { WorkspaceProvider } from '../workspace/WorkspaceProvider.tsx';
import { useWorkspace } from '../workspace/useWorkspace.ts';
import { AppShell } from './AppShell.tsx';

/** Decides what a signed-in user can see before any page renders. */
function WorkspaceGate() {
  const { me, branches, currentBranch } = useWorkspace();
  const { signOut } = useSession();
  const { pathname } = useLocation();

  if (me.status === 'loading') return <LoadingState label="Cargando tu comercio…" />;
  if (me.status === 'error') {
    return (
      <ProblemState
        error={me.error}
        onRetry={me.reload}
        {...(me.error.kind === 'forbidden' ? { title: 'Tu cuenta no tiene acceso al panel de comercios' } : {})}
        actions={<Button variant="ghost" leadingIcon={<LogOut />} onPress={() => signOut()}>Usar otra cuenta</Button>}
      />
    );
  }
  if (branches.length === 0) {
    return (
      <EmptyState
        icon={<Store />}
        title="Aún no tienes una sucursal asignada"
        description="Cuando la persona que administra tu comercio te agregue a una sucursal, aquí podrás solicitar envíos."
        actions={<Button variant="secondary" leadingIcon={<LogOut />} onPress={() => signOut()}>Cerrar sesión</Button>}
      />
    );
  }
  if (!currentBranch && pathname !== '/sucursal') return <Navigate to="/sucursal" replace state={{ from: pathname }} />;
  return <Outlet />;
}

/** Routes behind sign-in. Unauthenticated visitors go to `/acceso` and come back afterwards. */
export function ProtectedLayout() {
  const { session } = useSession();
  const location = useLocation();
  if (!session) return <Navigate to="/acceso" replace state={{ from: location.pathname }} />;
  return (
    <WorkspaceProvider>
      <AppShell>
        <WorkspaceGate />
      </AppShell>
    </WorkspaceProvider>
  );
}
