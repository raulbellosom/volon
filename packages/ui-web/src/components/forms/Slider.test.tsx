import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { axeViolations } from '../../test/axe.ts';
import { Slider } from './Slider.tsx';

describe('Slider', () => {
  it('changes with arrow keys and shows the formatted output', async () => {
    const onChange = vi.fn();
    const { container } = render(
      <Slider label="Radio de búsqueda" defaultValue={3} minValue={1} maxValue={10} formatOptions={{ style: 'unit', unit: 'kilometer' }} onChange={onChange} />,
    );
    const thumb = screen.getByRole('slider', { name: 'Radio de búsqueda' });
    await userEvent.tab();
    expect(thumb).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}{ArrowRight}');
    expect(onChange).toHaveBeenLastCalledWith(5);
    expect(screen.getByRole('status')).toHaveTextContent('5');
    await userEvent.keyboard('{End}');
    expect(onChange).toHaveBeenLastCalledWith(10);
    expect(await axeViolations(container)).toEqual([]);
  });

  it('supports ranges with named thumbs that cannot cross', async () => {
    const onChange = vi.fn();
    render(<Slider label="Horario" defaultValue={[12, 20]} minValue={8} maxValue={23} thumbLabels={['Inicio', 'Fin']} onChange={onChange} />);
    const start = screen.getByRole('slider', { name: /Inicio/ });
    expect(screen.getByRole('slider', { name: /Fin/ })).toBeInTheDocument();
    start.focus();
    await userEvent.keyboard('{End}');
    expect(onChange).toHaveBeenLastCalledWith([20, 20]);
  });
});
