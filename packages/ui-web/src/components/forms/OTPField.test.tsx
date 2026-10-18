import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { axeViolations } from '../../test/axe.ts';
import { OTPField } from './OTPField.tsx';

describe('OTPField', () => {
  it('is one labelled input tuned for SMS codes that keeps only digits', async () => {
    const onChange = vi.fn();
    const { container } = render(<OTPField label="Código de verificación" length={4} onChange={onChange} />);
    const input = screen.getByRole('textbox', { name: 'Código de verificación' });
    expect(input).toHaveAttribute('autocomplete', 'one-time-code');
    expect(input).toHaveAttribute('inputmode', 'numeric');
    await userEvent.type(input, '1a2-3');
    expect(onChange).toHaveBeenLastCalledWith('123');
    expect(container.querySelectorAll('[aria-hidden="true"] > span')[2]).toHaveTextContent('3');
    expect(await axeViolations(container)).toEqual([]);
  });

  it('accepts a pasted code, truncates it and calls onComplete once', async () => {
    const onComplete = vi.fn();
    render(<OTPField label="Código" length={6} onComplete={onComplete} />);
    const input = screen.getByRole('textbox', { name: 'Código' });
    await userEvent.click(input);
    await userEvent.paste('482 913 77');
    expect(input).toHaveValue('482913');
    expect(onComplete).toHaveBeenCalledOnce();
    expect(onComplete).toHaveBeenCalledWith('482913');
  });

  it('announces errors through the input', () => {
    render(<OTPField label="Código" isInvalid errorMessage="El código no coincide." />);
    expect(screen.getByRole('textbox', { name: 'Código' })).toHaveAccessibleDescription('El código no coincide.');
  });
});
