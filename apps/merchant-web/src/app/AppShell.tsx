import { ConnectionStatus, Navbar, ThemeToggle, type NavItem } from '@delivery/ui-web';
import { House, PackagePlus, Store } from 'lucide-react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router';
import { useOnlineStatus } from '../shared/useOnlineStatus.ts';
import { AccountMenu } from './AccountMenu.tsx';
import { DemoBanner } from './DemoBanner.tsx';
import { isDemoMode } from './services.ts';

const NAV_ITEMS: readonly NavItem[] = [
  { id: 'home', label: 'Inicio', href: '/', icon: <House /> },
  { id: 'new', label: 'Nuevo envío', href: '/envios/nuevo', icon: <PackagePlus /> },
  { id: 'branch', label: 'Sucursal', href: '/sucursal', icon: <Store /> },
];

function currentNav(pathname: string): string | undefined {
  if (pathname === '/') return 'home';
  if (pathname === '/envios/nuevo') return 'new';
  if (pathname === '/sucursal') return 'branch';
  return undefined;
}

/** Signed-in frame: navigation, connectivity notice and a centered content column. */
export function AppShell({ children }: { children: ReactNode }) {
  const online = useOnlineStatus();
  const { pathname } = useLocation();
  const current = currentNav(pathname);
  return (
    <div className="flex min-h-dvh flex-col bg-background text-text-primary">
      {isDemoMode && <DemoBanner />}
      <Navbar
        items={NAV_ITEMS}
        {...(current ? { currentId: current } : {})}
        actions={<><ThemeToggle compact /><AccountMenu /></>}
      />
      <main id="contenido" className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10">
        {!online && (
          <div className="flex flex-wrap items-center gap-3">
            <ConnectionStatus state="offline" />
            <p className="text-sm text-text-secondary">Puedes seguir viendo esta pantalla; las acciones se habilitan al reconectar.</p>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
