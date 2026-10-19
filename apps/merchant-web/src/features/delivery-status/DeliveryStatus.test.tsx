import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../api/api-error.ts';
import type { DeliveryResponse } from '../../api/merchant-api.ts';
import { renderApp } from '../../test/render-app.tsx';

const DELIVERY: DeliveryResponse = {
  deliveryId: 'delivery_test',
  branchId: 'branch_demo_marina',
  quoteId: 'quote_test',
  status: 'requested',
  version: 1,
  createdAt: '2026-10-18T20:05:00.000Z',
  pricing: { amountMinor: 6150, currency: 'MXN', lines: [{ code: 'base_delivery', amountMinor: 6150 }], rateVersion: 'test' },
};

describe('delivery status', () => {
  it('shows the recorded status, the server price and what comes next', async () => {
    const getDelivery = vi.fn().mockResolvedValue(DELIVERY);
    renderApp('/envios/delivery_test', { api: { getDelivery } });

    expect(await screen.findByRole('heading', { name: 'Estado del envío' })).toBeInTheDocument();
    expect(getDelivery).toHaveBeenCalledWith('delivery_test');
    const timeline = screen.getByRole('list', { name: 'Avance del envío' });
    expect(within(timeline).getByText('Solicitado').closest('li')).toHaveAttribute('aria-current', 'step');
    expect(within(timeline).getByText('Entregado')).toBeInTheDocument();
    expect(screen.getAllByText('$61.50').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Sucursal demo Marina').length).toBeGreaterThan(0);
    expect(screen.getByText('El seguimiento en vivo aún no está disponible')).toBeInTheDocument();
    expect(screen.getByText('El sistema aún no la registra.')).toBeInTheDocument();
  });

  it('reports a delivery that does not exist', async () => {
    renderApp('/envios/nada', { api: { getDelivery: () => Promise.reject(new ApiError('not-found', 404, 'NOT_FOUND')) } });
    expect(await screen.findByText('No encontramos este envío')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Volver al inicio/ })).toBeInTheDocument();
  });

  it('reports a delivery from another merchant as access denied', async () => {
    renderApp('/envios/ajeno', { api: { getDelivery: () => Promise.reject(new ApiError('forbidden', 403, 'ACCESS_DENIED')) } });
    expect(await screen.findByText('No tienes acceso')).toBeInTheDocument();
  });

  it('opens a delivery from the home lookup', async () => {
    const { user, router } = renderApp('/', { api: { getDelivery: async () => DELIVERY } });
    await user.type(await screen.findByRole('textbox', { name: /Folio del envío/ }), 'delivery_test');
    await user.click(screen.getByRole('button', { name: /Ver estado/ }));
    expect(await screen.findByRole('heading', { name: 'Estado del envío' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/envios/delivery_test');
  });
});
