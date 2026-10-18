import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Plus } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { axeViolations } from '../../test/axe.ts';
import { Button } from './Button.tsx';
import { IconButton } from './IconButton.tsx';

describe('Button', () => {
  it('fires onPress from pointer and keyboard (Enter and Space)', async () => {
    const onPress = vi.fn();
    render(<Button onPress={onPress}>Guardar</Button>);
    const button = screen.getByRole('button', { name: 'Guardar' });
    await userEvent.tab();
    expect(button).toHaveFocus();
    await userEvent.click(button);
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    expect(onPress).toHaveBeenCalledTimes(3);
  });

  it('does not fire while disabled and exposes the native disabled state', async () => {
    const onPress = vi.fn();
    render(<Button isDisabled onPress={onPress}>Guardar</Button>);
    const button = screen.getByRole('button', { name: 'Guardar' });
    await userEvent.click(button);
    expect(onPress).not.toHaveBeenCalled();
    expect(button).toBeDisabled();
  });

  it('keeps its label, blocks presses and marks itself pending while loading', async () => {
    const onPress = vi.fn();
    render(<Button isPending onPress={onPress} leadingIcon={<Plus data-testid="icon" />}>Enviar</Button>);
    const button = screen.getByRole('button', { name: /Enviar/ });
    await userEvent.click(button);
    expect(onPress).not.toHaveBeenCalled();
    expect(button).toHaveAttribute('data-pending', 'true');
    expect(screen.queryByTestId('icon')).not.toBeInTheDocument();
  });

  it('applies the requested variant and full width layout', () => {
    render(<Button variant="danger" fullWidth>Eliminar</Button>);
    const button = screen.getByRole('button', { name: 'Eliminar' });
    expect(button.className).toContain('bg-action-danger');
    expect(button.className).toContain('w-full');
  });

  it('has no axe violations', async () => {
    const { container } = render(<Button variant="accent">Pídelo</Button>);
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe('IconButton', () => {
  it('uses the label as accessible name and has no axe violations', async () => {
    const { container } = render(<IconButton label="Agregar envío" icon={<Plus />} />);
    expect(screen.getByRole('button', { name: 'Agregar envío' })).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });
});
