import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Store } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { axeViolations } from '../../test/axe.ts';
import { Checkbox, CheckboxGroup } from './Checkbox.tsx';
import { Option } from './ListBoxItem.tsx';
import { Radio, RadioGroup } from './RadioGroup.tsx';
import { Select } from './Select.tsx';
import { Switch } from './Switch.tsx';

describe('Checkbox', () => {
  it('toggles with click and Space, and supports indeterminate', async () => {
    const onChange = vi.fn();
    render(
      <>
        <Checkbox onChange={onChange}>Acepto los términos</Checkbox>
        <Checkbox isIndeterminate>Seleccionar todo</Checkbox>
      </>,
    );
    const checkbox = screen.getByRole('checkbox', { name: 'Acepto los términos' });
    await userEvent.click(checkbox);
    expect(checkbox).toBeChecked();
    await userEvent.keyboard(' ');
    expect(onChange).toHaveBeenLastCalledWith(false);
    expect(screen.getByRole('checkbox', { name: 'Seleccionar todo' })).toHaveProperty('indeterminate', true);
  });

  it('groups options under one accessible label without axe violations', async () => {
    const { container } = render(
      <CheckboxGroup label="Avisos" defaultValue={['sms']}>
        <Checkbox value="sms">SMS</Checkbox>
        <Checkbox value="email">Correo</Checkbox>
      </CheckboxGroup>,
    );
    expect(screen.getByRole('group', { name: 'Avisos' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'SMS' })).toBeChecked();
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe('RadioGroup', () => {
  it('moves the selection with arrow keys', async () => {
    const onChange = vi.fn();
    render(
      <RadioGroup label="Tamaño del paquete" defaultValue="small" onChange={onChange}>
        <Radio value="small">Chico</Radio>
        <Radio value="medium">Mediano</Radio>
      </RadioGroup>,
    );
    await userEvent.tab();
    expect(screen.getByRole('radio', { name: 'Chico' })).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    expect(onChange).toHaveBeenCalledWith('medium');
    expect(screen.getByRole('radio', { name: 'Mediano' })).toBeChecked();
  });
});

describe('Switch', () => {
  it('is exposed as a switch and toggles with Space', async () => {
    const onChange = vi.fn();
    const { container } = render(<Switch onChange={onChange}>Notificaciones</Switch>);
    await userEvent.tab();
    await userEvent.keyboard(' ');
    expect(onChange).toHaveBeenCalledWith(true);
    expect(screen.getByRole('switch', { name: 'Notificaciones' })).toBeChecked();
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe('Select', () => {
  it('opens with the keyboard and selects an option', async () => {
    const onSelectionChange = vi.fn();
    render(
      <Select label="Sucursal" icon={<Store />} onSelectionChange={onSelectionChange}>
        <Option id="centro">Centro</Option>
        <Option id="marina">Marina</Option>
      </Select>,
    );
    const trigger = screen.getByRole('button', { name: /Sucursal/ });
    expect(trigger).toHaveTextContent('Selecciona una opción');
    await userEvent.tab();
    await userEvent.keyboard('{ArrowDown}');
    const listbox = await screen.findByRole('listbox');
    expect(listbox).toBeInTheDocument();
    await userEvent.click(screen.getByRole('option', { name: 'Marina' }));
    expect(onSelectionChange).toHaveBeenCalledWith('marina');
    expect(trigger).toHaveTextContent('Marina');
    expect(trigger.querySelector('[data-placeholder]')).toBeNull();
  });
});
