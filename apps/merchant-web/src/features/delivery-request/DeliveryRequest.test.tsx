import { act, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../api/api-error.ts';
import type { DeliveryQuoteResponse } from '../../api/merchant-api.ts';
import { renderApp } from '../../test/render-app.tsx';

const QUOTE: DeliveryQuoteResponse = {
  quoteId: 'quote_test',
  expiresAt: new Date(Date.now() + 600_000).toISOString(),
  currency: 'MXN',
  amountMinor: 6150,
  lines: [{ code: 'base_delivery', amountMinor: 3500 }, { code: 'distance_delivery', amountMinor: 2650 }],
  coverage: 'eligible',
};

async function reachQuote(options: Parameters<typeof renderApp>[1] = {}) {
  const app = renderApp('/envios/nuevo', options);
  const { user } = app;
  await screen.findByRole('heading', { name: '¿De dónde sale el envío?' });
  expect(screen.getByRole('radio', { name: /Sucursal demo Centro/ })).toBeChecked();
  await user.click(screen.getByRole('button', { name: /Continuar/ }));
  expect(screen.getByRole('button', { name: /Cotizar envío/ })).toBeDisabled();
  await user.type(screen.getByRole('textbox', { name: /Dirección de entrega/ }), 'Av. México 1234');
  await user.click(screen.getByRole('button', { name: /Cotizar envío/ }));
  return app;
}

describe('new delivery request', () => {
  it('quotes with server amounts and confirms with one idempotency key', async () => {
    const createQuote = vi.fn().mockResolvedValue(QUOTE);
    const createDelivery = vi.fn().mockRejectedValueOnce(new ApiError('unavailable', 503));
    const { user } = await reachQuote({ api: { createQuote, createDelivery } });

    expect(createQuote).toHaveBeenCalledWith(expect.objectContaining({ branchId: 'branch_demo_centro', serviceType: 'local_delivery' }));
    expect(await screen.findByText('$61.50')).toBeInTheDocument();
    expect(screen.getByText('Cargo por distancia')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Revisa el precio' })).toHaveFocus();

    await user.click(screen.getByRole('button', { name: /Confirmar envío/ }));
    expect(await screen.findByText('No pudimos confirmar el envío')).toBeInTheDocument();

    createDelivery.mockResolvedValueOnce({
      deliveryId: 'delivery_test', branchId: 'branch_demo_centro', quoteId: QUOTE.quoteId, status: 'requested', version: 1,
      createdAt: new Date().toISOString(), pricing: { amountMinor: QUOTE.amountMinor, currency: 'MXN', lines: QUOTE.lines, rateVersion: 'test' },
    });
    await user.click(screen.getByRole('button', { name: /Confirmar envío/ }));

    expect(await screen.findByRole('heading', { name: 'Solicitud enviada' })).toBeInTheDocument();
    const [first, retry] = createDelivery.mock.calls.map(([input]) => input as { idempotencyKey: string });
    expect(first?.idempotencyKey).toBeTruthy();
    expect(retry?.idempotencyKey).toBe(first?.idempotencyKey);
    expect(screen.getByRole('link', { name: /Ver estado del envío/ })).toHaveAttribute('href', '/envios/delivery_test');
  });

  it('blocks confirmation once the quote expires and lets the merchant quote again', async () => {
    const expired = { ...QUOTE, expiresAt: new Date(Date.now() - 1000).toISOString() };
    const createQuote = vi.fn().mockResolvedValueOnce(expired).mockResolvedValueOnce(QUOTE);
    const { user } = await reachQuote({ api: { createQuote } });

    expect(await screen.findByText('La cotización venció')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Confirmar envío/ })).toBeDisabled();
    await user.click(screen.getAllByRole('button', { name: /Cotizar de nuevo/ })[0]!);
    expect(await screen.findByText(/Precio garantizado por/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Confirmar envío/ })).toBeEnabled();
  });

  it('treats a server QUOTE_EXPIRED answer as an expired quote', async () => {
    const { user } = await reachQuote({
      api: { createQuote: async () => QUOTE, createDelivery: () => Promise.reject(new ApiError('quote-expired', 409, 'QUOTE_EXPIRED')) },
    });
    await user.click(await screen.findByRole('button', { name: /Confirmar envío/ }));
    expect(await screen.findByText('La cotización venció')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Confirmar envío/ })).toBeDisabled();
  });

  it('explains an out-of-coverage destination', async () => {
    await reachQuote({ api: { createQuote: () => Promise.reject(new ApiError('invalid', 422, 'OUTSIDE_COVERAGE')) } });
    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText(/fuera de la zona de servicio/)).toBeInTheDocument();
  });

  it('disables confirmation while the browser is offline', async () => {
    await reachQuote({ api: { createQuote: async () => QUOTE } });
    await screen.findByText(/Precio garantizado por/);
    const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    act(() => void window.dispatchEvent(new Event('offline')));
    expect(screen.getByRole('status', { name: '' })).toBeInTheDocument();
    expect(screen.getByText('Sin conexión')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Confirmar envío/ })).toBeDisabled();
    onLine.mockRestore();
  });
});
