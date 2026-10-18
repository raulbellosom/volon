import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { axeViolations } from '../../test/axe.ts';
import { Button } from '../actions/Button.tsx';
import { Menu, MenuItem, MenuTrigger } from './Menu.tsx';
import { Navbar } from './Navbar.tsx';
import { Pagination, pageItems } from './Pagination.tsx';
import { SiteFooter } from './SiteFooter.tsx';
import { Tab, TabList, TabPanel, Tabs } from './Tabs.tsx';

const ITEMS = [
  { id: 'deliveries', label: 'Envíos', href: '/envios' },
  { id: 'branches', label: 'Sucursales', href: '/sucursales' },
];

describe('Tabs', () => {
  it('moves selection with arrow keys and shows the matching panel', async () => {
    render(
      <Tabs>
        <TabList aria-label="Envíos">
          <Tab id="active" count={3}>Activos</Tab>
          <Tab id="done">Terminados</Tab>
        </TabList>
        <TabPanel id="active">Lista activa</TabPanel>
        <TabPanel id="done">Lista terminada</TabPanel>
      </Tabs>,
    );
    await userEvent.tab();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Terminados' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Lista terminada');
  });
});

describe('Menu', () => {
  it('opens from its trigger and runs the chosen action', async () => {
    const onAction = vi.fn();
    render(
      <MenuTrigger>
        <Button>Acciones</Button>
        <Menu onAction={onAction}>
          <MenuItem id="edit">Editar</MenuItem>
          <MenuItem id="delete" tone="danger">Eliminar</MenuItem>
        </Menu>
      </MenuTrigger>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Acciones' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Eliminar' }));
    expect(onAction.mock.calls[0]?.[0]).toBe('delete');
  });
});

describe('Pagination', () => {
  it('collapses long ranges with ellipses around the current page', () => {
    expect(pageItems(1, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(pageItems(6, 12)).toEqual([1, 'ellipsis-start', 5, 6, 7, 'ellipsis-end', 12]);
    expect(pageItems(2, 12)).toEqual([1, 2, 3, 'ellipsis-end', 12]);
  });

  it('marks the current page and disables previous on the first page', async () => {
    const onPageChange = vi.fn();
    render(<Pagination page={1} pageCount={4} pageSize={10} totalItems={35} onPageChange={onPageChange} />);
    expect(screen.getByRole('navigation', { name: 'Paginación' })).toHaveTextContent('1–10');
    expect(screen.getByRole('button', { name: 'Página 1' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Página anterior' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Página siguiente' }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});

describe('Navbar', () => {
  it('marks the current page and exposes the same links in the mobile menu', async () => {
    const { container } = render(<Navbar items={ITEMS} currentId="branches" />);
    const desktop = screen.getByRole('navigation', { name: 'Principal' });
    expect(within(desktop).getByRole('link', { name: 'Sucursales' })).toHaveAttribute('aria-current', 'page');
    expect(await axeViolations(container)).toEqual([]);
    await userEvent.click(screen.getByRole('button', { name: 'Abrir menú' }));
    const mobile = await screen.findByRole('navigation', { name: 'Principal (móvil)' });
    expect(within(mobile).getAllByRole('link')).toHaveLength(2);
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});

describe('SiteFooter', () => {
  it('is a contentinfo landmark with labelled link groups', () => {
    render(<SiteFooter columns={[{ title: 'Producto', links: [{ label: 'Envíos', href: '/envios' }] }]} legal="© Volon" />);
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(within(screen.getByRole('navigation', { name: 'Producto' })).getByRole('link', { name: 'Envíos' })).toBeInTheDocument();
  });
});
