import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Inbox, Truck } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { axeViolations } from '../../test/axe.ts';
import { Accordion, AccordionItem } from '../content/Accordion.tsx';
import { Breadcrumbs } from './Breadcrumbs.tsx';
import { Sidebar, SidebarItem, SidebarSection } from './Sidebar.tsx';
import { Stepper, stepState } from './Stepper.tsx';

describe('Breadcrumbs', () => {
  it('marks the last item as current and offers a back link for phones', () => {
    render(<Breadcrumbs items={[{ id: 'a', label: 'Envíos', href: '/envios' }, { id: 'b', label: 'PV-1042' }]} />);
    const nav = screen.getByRole('navigation', { name: 'Ruta de navegación' });
    expect(within(nav).getAllByRole('link', { name: 'Envíos' })).toHaveLength(2);
    expect(within(nav).getByText('PV-1042').closest('[aria-current]')).toHaveAttribute('aria-current', 'page');
  });
});

describe('Stepper', () => {
  it('derives step states and exposes the current step in words', async () => {
    expect([0, 1, 2].map((index) => stepState(index, 1))).toEqual(['complete', 'current', 'upcoming']);
    const { container } = render(
      <Stepper aria-label="Alta de sucursal" currentIndex={1} steps={[{ id: 'a', label: 'Datos' }, { id: 'b', label: 'Horario' }, { id: 'c', label: 'Pago' }]} />,
    );
    const current = container.querySelector('[aria-current="step"]');
    expect(current).toHaveTextContent(/Horario.*paso actual/);
    expect(screen.getByText(/Datos/).textContent).toMatch(/completado/);
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe('Sidebar', () => {
  it('is a labelled landmark with the current page and pending counts in words', async () => {
    const { container, rerender } = render(
      <Sidebar aria-label="Navegación del panel">
        <SidebarSection title="Operación">
          <SidebarItem href="/envios" label="Envíos" icon={<Truck />} isCurrent count={3} />
          <SidebarItem href="/bandeja" label="Bandeja" icon={<Inbox />} />
        </SidebarSection>
      </Sidebar>,
    );
    const nav = screen.getByRole('navigation', { name: 'Navegación del panel' });
    expect(within(nav).getByRole('link', { name: 'Envíos, 3 pendientes' })).toHaveAttribute('aria-current', 'page');
    expect(await axeViolations(container)).toEqual([]);
    rerender(
      <Sidebar aria-label="Navegación del panel" collapsed>
        <SidebarSection title="Operación"><SidebarItem href="/envios" label="Envíos" icon={<Truck />} count={3} collapsed /></SidebarSection>
      </Sidebar>,
    );
    expect(screen.getByRole('link', { name: 'Envíos, 3 pendientes' })).toBeInTheDocument();
  });
});

describe('Accordion', () => {
  it('expands with the keyboard and links the panel to its trigger', async () => {
    render(
      <Accordion>
        <AccordionItem id="a" title="¿Qué puedo enviar?">Comida y paquetes chicos.</AccordionItem>
        <AccordionItem id="b" title="¿Cuánto cuesta?">Depende de la ruta.</AccordionItem>
      </Accordion>,
    );
    const trigger = screen.getByRole('button', { name: '¿Qué puedo enviar?' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await userEvent.tab();
    await userEvent.keyboard('{Enter}');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('group', { name: '¿Qué puedo enviar?' })).toHaveTextContent('Comida y paquetes chicos.');
    await userEvent.click(screen.getByRole('button', { name: '¿Cuánto cuesta?' }));
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });
});
