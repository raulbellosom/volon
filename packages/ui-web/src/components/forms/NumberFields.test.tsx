import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Weight } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { axeViolations } from '../../test/axe.ts';
import { CurrencyField, toMinorUnits } from './CurrencyField.tsx';
import { NumberField } from './NumberField.tsx';

describe('NumberField', () => {
  it('steps with the buttons and arrow keys and clamps to its bounds', async () => {
    const onChange = vi.fn();
    const { container } = render(
      <NumberField label="Peso" icon={<Weight />} unit="kg" defaultValue={4} minValue={0} maxValue={5} onChange={onChange} />,
    );
    const input = screen.getByRole('textbox', { name: 'Peso' });
    await userEvent.click(screen.getByRole('button', { name: /Aumentar|Increase/i }));
    expect(onChange).toHaveBeenLastCalledWith(5);
    await userEvent.click(input);
    await userEvent.keyboard('{ArrowUp}');
    expect(input).toHaveValue('5');
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    expect(onChange).toHaveBeenLastCalledWith(3);
    expect(await axeViolations(container)).toEqual([]);
  });

  it('hides the stepper on request and exposes invalid state', () => {
    render(<NumberField label="Bultos" icon={<Weight />} hideStepper isInvalid errorMessage="Máximo 3 bultos." />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Bultos' })).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('CurrencyField', () => {
  it('formats pesos in es-MX and reports integer centavos', async () => {
    const onChangeMinor = vi.fn();
    render(<CurrencyField label="Valor declarado" defaultValueMinor={125050} onChangeMinor={onChangeMinor} />);
    const input = screen.getByRole('textbox', { name: 'Valor declarado' });
    expect(input).toHaveValue('$1,250.50');
    await userEvent.clear(input);
    await userEvent.type(input, '99.99');
    await userEvent.tab();
    expect(onChangeMinor).toHaveBeenLastCalledWith(9999);
    expect(input).toHaveValue('$99.99');
  });

  it('cannot type negative amounts by default and empties to null', async () => {
    const onChangeMinor = vi.fn();
    render(<CurrencyField label="Monto" defaultValueMinor={500} onChangeMinor={onChangeMinor} />);
    const input = screen.getByRole('textbox', { name: 'Monto' });
    await userEvent.clear(input);
    await userEvent.type(input, '-20');
    await userEvent.tab();
    // The minus sign is rejected while typing because the minimum is 0.
    expect(onChangeMinor).toHaveBeenLastCalledWith(2000);
    await userEvent.clear(input);
    await userEvent.tab();
    expect(onChangeMinor).toHaveBeenLastCalledWith(null);
  });

  it('converts to centavos without floating-point drift', () => {
    expect(toMinorUnits(0.1 + 0.2)).toBe(30);
    expect(toMinorUnits(1234.565)).toBe(123457);
    expect(toMinorUnits(Number.NaN)).toBeNull();
  });
});
