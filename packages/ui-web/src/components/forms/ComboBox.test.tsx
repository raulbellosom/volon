import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MapPinned } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { axeViolations } from '../../test/axe.ts';
import { ComboBox } from './ComboBox.tsx';
import { Option } from './ListBoxItem.tsx';

const COLONIAS = [
  { id: 'centro', name: 'Centro' },
  { id: 'versalles', name: 'Versalles' },
  { id: 'pitillal', name: 'El Pitillal' },
];

function Example({ onSelectionChange }: { onSelectionChange?: (key: unknown) => void }) {
  return (
    <ComboBox label="Colonia" icon={<MapPinned />} defaultItems={COLONIAS} {...(onSelectionChange ? { onSelectionChange } : {})}>
      {(colonia) => <Option id={colonia.id}>{colonia.name}</Option>}
    </ComboBox>
  );
}

describe('ComboBox', () => {
  it('filters as you type and selects with the keyboard', async () => {
    const onSelectionChange = vi.fn();
    const { container } = render(<Example onSelectionChange={onSelectionChange} />);
    const input = screen.getByRole('combobox', { name: 'Colonia' });
    await userEvent.type(input, 'ver');
    const options = await screen.findAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual(['Versalles']);
    await userEvent.keyboard('{ArrowDown}{Enter}');
    expect(onSelectionChange).toHaveBeenCalledWith('versalles');
    expect(input).toHaveValue('Versalles');
    expect(await axeViolations(container)).toEqual([]);
  });

  it('opens from the button and shows a message when nothing matches', async () => {
    render(<Example />);
    await userEvent.click(screen.getByRole('button'));
    expect(await screen.findAllByRole('option')).toHaveLength(3);
    await userEvent.type(screen.getByRole('combobox'), 'zzz');
    expect(await screen.findByText('Sin resultados')).toBeInTheDocument();
  });
});
