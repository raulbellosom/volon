import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { List, Map } from 'lucide-react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { axeViolations } from '../../test/axe.ts';
import { SegmentedControl } from './SegmentedControl.tsx';

const ITEMS = [
  { id: 'list', label: 'Lista', icon: <List /> },
  { id: 'map', label: 'Mapa', icon: <Map /> },
] as const;

function Controlled({ onChange }: { onChange: (key: string) => void }) {
  const [key, setKey] = useState<'list' | 'map'>('list');
  return (
    <SegmentedControl
      aria-label="Vista"
      items={ITEMS}
      selectedKey={key}
      onSelectionChange={(next) => { setKey(next); onChange(next); }}
    />
  );
}

describe('SegmentedControl', () => {
  it('is a labelled radio group that never allows an empty selection', async () => {
    const onChange = vi.fn();
    const { container } = render(<Controlled onChange={onChange} />);
    expect(screen.getByRole('radiogroup', { name: 'Vista' })).toBeInTheDocument();
    const list = screen.getByRole('radio', { name: 'Lista' });
    expect(list).toBeChecked();
    await userEvent.click(list);
    expect(list).toBeChecked();
    expect(onChange).not.toHaveBeenCalled();
    expect(await axeViolations(container)).toEqual([]);
  });

  it('moves the selection with the keyboard', async () => {
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);
    await userEvent.tab();
    await userEvent.keyboard('{ArrowRight}');
    await userEvent.keyboard(' ');
    expect(onChange).toHaveBeenLastCalledWith('map');
    expect(screen.getByRole('radio', { name: 'Mapa' })).toBeChecked();
  });

  it('keeps accessible names in icon-only mode and respects isDisabled', () => {
    render(<SegmentedControl aria-label="Vista" items={ITEMS} selectedKey="list" onSelectionChange={() => undefined} iconOnly isDisabled />);
    expect(screen.getByRole('radio', { name: 'Mapa' })).toBeDisabled();
    expect(screen.queryByText('Mapa')).not.toBeInTheDocument();
  });
});
