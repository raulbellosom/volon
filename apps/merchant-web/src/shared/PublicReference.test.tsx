import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PublicReference } from './PublicReference.tsx';

describe('public reference', () => {
  it('copies the complete human folio and announces confirmation without a UUID', async () => {
    const user = userEvent.setup();
    const write = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
    render(<PublicReference value="VL-26-7K9M2Q" />);
    expect(screen.getByText('VL-26-7K9M2Q')).toHaveClass('whitespace-nowrap');
    await user.click(screen.getByRole('button', { name: 'Copiar folio VL-26-7K9M2Q' }));
    expect(write).toHaveBeenCalledWith('VL-26-7K9M2Q');
    expect(await screen.findByRole('status')).toHaveTextContent('Folio copiado.');
  });
  it('shows a manual alternative when the clipboard is denied, and clears stale feedback for another folio', async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'));
    const { rerender } = render(<PublicReference value="VL-26-7K9M2Q" />);
    await user.click(screen.getByRole('button', { name: /Copiar folio/ }));
    expect(await screen.findByRole('status')).toHaveTextContent('Selecciona el folio y cópialo manualmente.');
    rerender(<PublicReference value="AB-27-234567" />);
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });
});
