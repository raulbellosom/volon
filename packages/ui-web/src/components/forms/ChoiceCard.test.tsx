import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Bike, Car, FileText, Package } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { axeViolations } from '../../test/axe.ts';
import { CheckboxGroup } from './Checkbox.tsx';
import { CheckboxCard, RadioCard } from './ChoiceCard.tsx';
import { RadioGroup } from './RadioGroup.tsx';

describe('RadioCard', () => {
  it('works as a radio group with arrow keys and exposes title + description', async () => {
    const onChange = vi.fn();
    const { container } = render(
      <RadioGroup label="Vehículo" layout="cards" defaultValue="moto" onChange={onChange}>
        <RadioCard value="moto" icon={<Bike />} title="Moto" description="Hasta 5 kg" />
        <RadioCard value="car" icon={<Car />} title="Auto" description="Hasta 30 kg" />
      </RadioGroup>,
    );
    const moto = screen.getByRole('radio', { name: /Moto/ });
    expect(moto).toBeChecked();
    await userEvent.tab();
    await userEvent.keyboard('{ArrowDown}');
    expect(onChange).toHaveBeenCalledWith('car');
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe('CheckboxCard', () => {
  it('toggles independently inside a checkbox group', async () => {
    render(
      <CheckboxGroup label="Contenido" layout="cards">
        <CheckboxCard value="food" icon={<Package />} title="Comida" />
        <CheckboxCard value="docs" icon={<FileText />} title="Documentos" isDisabled />
      </CheckboxGroup>,
    );
    await userEvent.click(screen.getByRole('checkbox', { name: /Comida/ }));
    expect(screen.getByRole('checkbox', { name: /Comida/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Documentos/ })).toBeDisabled();
  });
});
