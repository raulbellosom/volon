import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Mail } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { axeViolations } from '../../test/axe.ts';
import { PasswordField } from './PasswordField.tsx';
import { SearchField } from './SearchField.tsx';
import { TextField } from './TextField.tsx';

describe('TextField', () => {
  it('links label, help text and required state to the input', async () => {
    const { container } = render(
      <TextField label="Correo" description="Te enviaremos el recibo." isRequired leadingIcon={<Mail />} />,
    );
    const input = screen.getByRole('textbox', { name: /Correo/ });
    expect(input).toBeRequired();
    expect(input).toHaveAccessibleDescription('Te enviaremos el recibo.');
    expect(await axeViolations(container)).toEqual([]);
  });

  it('announces a custom error message when invalid', () => {
    render(<TextField label="Teléfono" isInvalid errorMessage="Escribe 10 dígitos." />);
    const input = screen.getByRole('textbox', { name: 'Teléfono' });
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription(/Escribe 10 dígitos\./);
  });

  it('accepts typing, but not when disabled; read-only keeps focus without edits', async () => {
    const onChange = vi.fn();
    render(
      <>
        <TextField label="Nombre" onChange={onChange} />
        <TextField label="Folio" isDisabled />
        <TextField label="Zona" isReadOnly defaultValue="Centro" />
      </>,
    );
    await userEvent.type(screen.getByRole('textbox', { name: 'Nombre' }), 'Ana');
    expect(onChange).toHaveBeenLastCalledWith('Ana');
    expect(screen.getByRole('textbox', { name: 'Folio' })).toBeDisabled();
    const readOnly = screen.getByRole('textbox', { name: 'Zona' });
    await userEvent.type(readOnly, 'X');
    expect(readOnly).toHaveValue('Centro');
  });

  it('renders a multi-line text area', () => {
    render(<TextField label="Indicaciones" multiline />);
    expect(screen.getByRole('textbox', { name: 'Indicaciones' }).tagName).toBe('TEXTAREA');
  });
});

describe('PasswordField', () => {
  it('toggles visibility with an accessible button', async () => {
    render(<PasswordField label="Contraseña" />);
    const input = screen.getByLabelText('Contraseña');
    expect(input).toHaveAttribute('type', 'password');
    await userEvent.click(screen.getByRole('button', { name: 'Mostrar contraseña' }));
    expect(input).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Ocultar contraseña' })).toBeInTheDocument();
  });
});

describe('SearchField', () => {
  it('clears with Escape and submits with Enter', async () => {
    const onSubmit = vi.fn();
    render(<SearchField aria-label="Buscar envíos" onSubmit={onSubmit} />);
    const input = screen.getByRole('searchbox', { name: 'Buscar envíos' });
    await userEvent.type(input, 'PV-102{Enter}');
    expect(onSubmit).toHaveBeenCalledWith('PV-102');
    await userEvent.keyboard('{Escape}');
    expect(input).toHaveValue('');
  });
});
