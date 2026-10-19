import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axeViolations } from '../../test/axe.ts';
import { DeliveryList, DeliveryListItem } from './DeliveryList.tsx';

describe('DeliveryList', () => {
  it('renders each delivery as one link with date, full folio, status and server amount', async () => {
    const { container } = render(
      <DeliveryList aria-label="Envíos de Sucursal Centro">
        <DeliveryListItem href="/envios/abc-123" title="18 oct 2026, 2:05 p.m." reference="abc-123" status="requested" statusLabel="Solicitado" amountMinor={6150} />
        <DeliveryListItem href="/envios/def-456" title="17 oct 2026, 7:12 p.m." reference="def-456" status="delivered" amountMinor={3500} />
      </DeliveryList>,
    );
    const list = screen.getByRole('list', { name: 'Envíos de Sucursal Centro' });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(2);

    const first = within(items[0]!).getByRole('link');
    expect(first).toHaveAttribute('href', '/envios/abc-123');
    expect(first).toHaveTextContent('18 oct 2026, 2:05 p.m.');
    expect(first).toHaveTextContent('Folio abc-123');
    expect(first).toHaveTextContent('Solicitado');
    expect(first).toHaveTextContent('$61.50');
    expect(within(items[1]!).getByRole('link')).toHaveTextContent('Entregada');
    expect(await axeViolations(container)).toEqual([]);
  });

  it('refuses fractional money like every other amount display', () => {
    expect(() => render(<DeliveryListItem href="#" title="x" reference="r" status="requested" amountMinor={12.5} />)).toThrow(RangeError);
  });
});
