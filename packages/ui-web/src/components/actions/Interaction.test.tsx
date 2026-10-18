import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Star } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { axeViolations } from '../../test/axe.ts';
import { Button } from './Button.tsx';
import { ButtonGroup } from './ButtonGroup.tsx';
import { Link, LinkButton } from './Link.tsx';
import { ToggleButton } from './ToggleButton.tsx';

describe('Link', () => {
  it('external links open in a new tab safely and announce it', async () => {
    const { container } = render(<p>Consulta la <Link href="https://example.com" external>guía de empaque</Link>.</p>);
    const link = screen.getByRole('link', { name: /guía de empaque.*otra pestaña/ });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(await axeViolations(container)).toEqual([]);
  });

  it('LinkButton keeps link semantics with button styling', () => {
    render(<LinkButton href="/envios" variant="primary">Ver envíos</LinkButton>);
    const link = screen.getByRole('link', { name: 'Ver envíos' });
    expect(link).toHaveAttribute('href', '/envios');
    expect(link.className).toContain('rounded-full');
  });
});

describe('ToggleButton', () => {
  it('exposes aria-pressed and toggles with Space', async () => {
    const onChange = vi.fn();
    render(<ToggleButton icon={<Star />} label="Favorito" onChange={onChange} />);
    const toggle = screen.getByRole('button', { name: 'Favorito' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await userEvent.tab();
    await userEvent.keyboard(' ');
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(onChange).toHaveBeenCalledWith(true);
  });
});

describe('ButtonGroup', () => {
  it('names the group and keeps each button reachable with Tab', async () => {
    render(
      <ButtonGroup aria-label="Acciones del envío" variant="attached">
        <Button variant="outline">Editar</Button>
        <Button variant="outline">Duplicar</Button>
      </ButtonGroup>,
    );
    const group = screen.getByRole('group', { name: 'Acciones del envío' });
    expect(within(group).getAllByRole('button')).toHaveLength(2);
    await userEvent.tab();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Duplicar' })).toHaveFocus();
  });
});
