import type { Meta, StoryObj } from '@storybook/react-vite';
import { Inbox, LayoutDashboard, Menu, PanelLeftClose, PanelLeftOpen, Settings, Store, Truck, Wallet } from 'lucide-react';
import { useState } from 'react';
import { DialogTrigger } from 'react-aria-components';
import { IconButton } from '../actions/IconButton.tsx';
import { Logo } from '../brand/Logo.tsx';
import { Drawer } from '../overlays/Drawer.tsx';
import { Sidebar, SidebarItem, SidebarSection } from './Sidebar.tsx';

const meta = {
  title: 'Navegación/Sidebar',
  component: Sidebar,
  parameters: { layout: 'fullscreen' },
  args: { 'aria-label': 'Navegación del panel', children: null },
} satisfies Meta<typeof Sidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

function Sections({ collapsed }: { collapsed?: boolean }) {
  const c = collapsed ? { collapsed: true } : {};
  return (
    <>
      <SidebarSection title="Operación">
        <SidebarItem href="#inicio" label="Inicio" icon={<LayoutDashboard />} {...c} />
        <SidebarItem href="#envios" label="Envíos" icon={<Truck />} isCurrent count={3} {...c} />
        <SidebarItem href="#bandeja" label="Incidencias" icon={<Inbox />} count={1} {...c} />
      </SidebarSection>
      <SidebarSection title="Negocio">
        <SidebarItem href="#sucursales" label="Sucursales" icon={<Store />} {...c} />
        <SidebarItem href="#pagos" label="Pagos" icon={<Wallet />} {...c} />
      </SidebarSection>
    </>
  );
}

function Desktop() {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="flex h-[640px]">
      <Sidebar
        aria-label="Navegación del panel"
        collapsed={collapsed}
        header={collapsed ? <Logo variant="symbol" size="sm" /> : <Logo size="sm" />}
        footer={
          <div className={collapsed ? 'flex flex-col items-center gap-1' : 'flex items-center justify-between'}>
            <IconButton label="Configuración" icon={<Settings />} />
            <IconButton label={collapsed ? 'Expandir menú' : 'Contraer menú'} icon={collapsed ? <PanelLeftOpen /> : <PanelLeftClose />} onPress={() => setCollapsed((value) => !value)} />
          </div>
        }
      >
        <Sections collapsed={collapsed} />
      </Sidebar>
      <main className="flex-1 p-8 text-sm text-text-secondary">Contenido. Contrae el menú con el botón inferior: las etiquetas pasan a tooltips.</main>
    </div>
  );
}

export const DesktopAndCollapsed: Story = { render: () => <Desktop /> };

export const PhoneInDrawer: Story = {
  globals: { viewport: { value: 'mobile1', isRotated: false } },
  render: () => (
    <div className="p-4">
      <DialogTrigger>
        <IconButton label="Abrir menú" icon={<Menu />} variant="outline" />
        <Drawer side="start" title={<Logo size="sm" />}>
          <Sidebar aria-label="Navegación del panel" className="w-full border-0 p-0"><Sections /></Sidebar>
        </Drawer>
      </DialogTrigger>
      <p className="mt-4 text-sm text-text-secondary">En teléfono, las mismas secciones viven dentro de un Drawer lateral.</p>
    </div>
  ),
};
