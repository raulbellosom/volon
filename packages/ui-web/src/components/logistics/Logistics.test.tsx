import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axeViolations } from '../../test/axe.ts';
import { formatDistance, formatDuration, formatMXN } from '../../utils/format.ts';
import { ConnectionStatus } from './ConnectionStatus.tsx';
import { PriceBreakdown } from './PriceBreakdown.tsx';
import { RouteSummary } from './RouteSummary.tsx';
import { Timeline } from './Timeline.tsx';

describe('format', () => {
  it('formats centavos, distances and durations for es-MX and rejects float money', () => {
    expect(formatMXN(125050)).toBe('$1,250.50');
    expect(() => formatMXN(12.5)).toThrow(RangeError);
    expect(formatDistance(850)).toBe('850 m');
    expect(formatDistance(3240)).toBe('3.2 km');
    expect(formatDuration(25)).toBe('25 min');
    expect(formatDuration(65)).toBe('1 h 05 min');
  });
});

describe('Timeline', () => {
  it('lists events in order with their state in words and marks the current one', async () => {
    const { container } = render(
      <Timeline
        aria-label="Historial del envío PV-1042"
        events={[
          { id: 'req', title: 'Solicitado', time: '13:40', dateTime: '2026-10-18T13:40:00-06:00', state: 'done' },
          { id: 'pick', title: 'Recogido', time: '14:05', state: 'current' },
          { id: 'drop', title: 'Entregado', state: 'upcoming' },
        ]}
      />,
    );
    const items = screen.getAllByRole('listitem');
    expect(items.map((item) => item.querySelector('p')?.textContent)).toEqual(['Solicitado, completado', 'Recogido, en curso', 'Entregado, pendiente']);
    expect(items[1]).toHaveAttribute('aria-current', 'step');
    expect(container.querySelector('time')).toHaveAttribute('dateTime', '2026-10-18T13:40:00-06:00');
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe('PriceBreakdown', () => {
  it('shows server lines and total without computing money', () => {
    render(
      <PriceBreakdown
        lines={[
          { id: 'base', label: 'Tarifa base', amountMinor: 4500 },
          { id: 'distance', label: 'Distancia', amountMinor: 1500 },
          { id: 'promo', label: 'Primer envío', amountMinor: 1000, kind: 'discount' },
        ]}
        totalMinor={9999}
      />,
    );
    // The total is displayed as given (9999), proving no client-side sum (4500+1500−1000 = 5000).
    expect(screen.getByText('$99.99')).toBeInTheDocument();
    expect(screen.getByText('Descuento de').parentElement).toHaveTextContent('−$10.00');
    expect(screen.getByText('Total').tagName).toBe('DT');
  });
});

describe('RouteSummary', () => {
  it('labels pickup and drop-off and only shows an estimate when provided', () => {
    const { rerender } = render(
      <RouteSummary pickup={{ name: 'Sucursal Centro', address: 'Juárez 120' }} dropoff={{ name: 'Ana López', address: 'Versalles' }} distanceMeters={3240} />,
    );
    expect(screen.getByText('Recogida')).toBeInTheDocument();
    expect(screen.getByText('3.2 km')).toBeInTheDocument();
    expect(screen.queryByText(/≈/)).not.toBeInTheDocument();
    rerender(<RouteSummary compact pickup={{ name: 'Centro', address: '' }} dropoff={{ name: 'Versalles', address: '' }} distanceMeters={850} durationMinutes={12} />);
    expect(screen.getByText('hacia')).toHaveClass('sr-only');
    expect(screen.getByText('850 m · ≈ 12 min')).toBeInTheDocument();
  });
});

describe('ConnectionStatus', () => {
  it('is a polite live region that names the state and freshness', () => {
    const { rerender } = render(<ConnectionStatus state="live" />);
    expect(screen.getByRole('status')).toHaveTextContent('En vivo');
    rerender(<ConnectionStatus state="stale" lastUpdated="hace 3 min" />);
    expect(screen.getByRole('status')).toHaveTextContent('Ubicación sin actualizar · hace 3 min');
  });
});
