import { Bell, LayoutDashboard, Store, Truck, Wallet } from 'lucide-react';
import { IconButton } from '../components/actions/IconButton.tsx';
import type { NavItem } from '../components/navigation/Navbar.tsx';
import type { FooterColumn } from '../components/navigation/SiteFooter.tsx';
import { ThemeToggle } from '../theme/ThemeToggle.tsx';

/** Gallery-only synthetic navigation data. */
export const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Inicio', href: '#inicio', icon: <LayoutDashboard /> },
  { id: 'deliveries', label: 'Envíos', href: '#envios', icon: <Truck /> },
  { id: 'branches', label: 'Sucursales', href: '#sucursales', icon: <Store /> },
  { id: 'billing', label: 'Pagos', href: '#pagos', icon: <Wallet /> },
];

export const NAV_ACTIONS = (
  <>
    <ThemeToggle compact />
    <IconButton label="Notificaciones" icon={<Bell />} />
  </>
);

export const FOOTER_COLUMNS: FooterColumn[] = [
  { title: 'Producto', links: [{ label: 'Envíos', href: '#envios' }, { label: 'Cobertura', href: '#cobertura' }, { label: 'Tarifas', href: '#tarifas' }] },
  { title: 'Comercios', links: [{ label: 'Registrar mi negocio', href: '#registro' }, { label: 'Centro de ayuda', href: '#ayuda' }] },
  { title: 'Legal', links: [{ label: 'Privacidad', href: '#privacidad' }, { label: 'Términos', href: '#terminos' }] },
];
