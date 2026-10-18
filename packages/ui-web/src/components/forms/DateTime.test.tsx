import { parseDate, parseTime, type CalendarDate } from '@internationalized/date';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { I18nProvider } from 'react-aria-components';
import { describe, expect, it, vi } from 'vitest';
import { axeViolations } from '../../test/axe.ts';
import { Calendar } from './Calendar.tsx';
import { DatePicker } from './DatePicker.tsx';
import { TimeField } from './TimeField.tsx';

const esMX = (node: ReactNode) => render(<I18nProvider locale="es-MX">{node}</I18nProvider>);

describe('DatePicker', () => {
  it('shows day/month/year segments in es-MX and edits them with the keyboard', async () => {
    const onChange = vi.fn();
    const { container } = esMX(<DatePicker label="Fecha de entrega" defaultValue={parseDate('2026-10-18')} onChange={onChange} />);
    const group = screen.getByRole('group', { name: 'Fecha de entrega' });
    const segments = within(group).getAllByRole('spinbutton');
    expect(segments.map((segment) => segment.getAttribute('aria-label'))).toEqual(expect.arrayContaining([expect.stringMatching(/día/i)]));
    await userEvent.click(segments[0] as HTMLElement);
    await userEvent.keyboard('{ArrowUp}');
    expect((onChange.mock.lastCall?.[0] as CalendarDate).toString()).toBe('2026-10-19');
    expect(await axeViolations(container)).toEqual([]);
  });

  it('picks a date from the calendar popover', async () => {
    const onChange = vi.fn();
    esMX(<DatePicker label="Fecha" defaultValue={parseDate('2026-10-18')} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: /^Elegir fecha en el calendario/ }));
    const grid = await screen.findByRole('grid');
    await userEvent.click(within(grid).getByRole('button', { name: /20 de octubre/i }));
    expect((onChange.mock.lastCall?.[0] as CalendarDate).toString()).toBe('2026-10-20');
  });

  it('validates min/max live with validationBehavior=aria and explains the error', () => {
    const { container } = esMX(
      <DatePicker label="Fecha" validationBehavior="aria" value={parseDate('2026-10-01')} minValue={parseDate('2026-10-10')} errorMessage="Elige una fecha a partir del 10 de octubre." />,
    );
    expect(container.querySelector('.group')).toHaveAttribute('data-invalid', 'true');
    expect(screen.getByText('Elige una fecha a partir del 10 de octubre.')).toBeInTheDocument();
  });
});

describe('Calendar', () => {
  it('moves focus with arrow keys and selects with Enter', async () => {
    const onChange = vi.fn();
    esMX(<Calendar aria-label="Calendario" defaultValue={parseDate('2026-10-18')} onChange={onChange} />);
    // Tab order: previous month, next month, then the focused day in the grid.
    await userEvent.tab();
    await userEvent.tab();
    await userEvent.tab();
    await userEvent.keyboard('{ArrowRight}{Enter}');
    expect((onChange.mock.lastCall?.[0] as CalendarDate).toString()).toBe('2026-10-19');
  });
});

describe('TimeField', () => {
  it('edits hour and minute segments', async () => {
    const onChange = vi.fn();
    esMX(<TimeField label="Hora de recogida" defaultValue={parseTime('14:05')} onChange={onChange} />);
    const segments = within(screen.getByRole('group', { name: 'Hora de recogida' })).getAllByRole('spinbutton');
    await userEvent.click(segments[0] as HTMLElement);
    await userEvent.keyboard('{ArrowUp}');
    expect(String(onChange.mock.lastCall?.[0])).toBe('15:05:00');
  });
});
