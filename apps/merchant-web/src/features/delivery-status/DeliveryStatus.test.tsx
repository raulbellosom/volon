import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../api/api-error.ts';
import type { DeliveryResponse } from '../../api/merchant-api.ts';
import { legacyLocations } from '../../demo/demo-fixtures.ts';
import { renderApp } from '../../test/render-app.tsx';

const DELIVERY: DeliveryResponse = {
  deliveryId: 'delivery_test', publicReference: 'VL-26-7K9M2Q',
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
    renderApp('/envios/delivery_test', { api: { getDelivery, getDeliveryLocations: async () => legacyLocations('branch_demo_marina') } });

    expect(await screen.findByRole('heading', { name: 'Estado del envío' })).toBeInTheDocument();
    expect(getDelivery).toHaveBeenCalledWith('delivery_test');
    expect(screen.getByText(DELIVERY.publicReference)).toBeInTheDocument();
    expect(screen.queryByText(DELIVERY.deliveryId)).not.toBeInTheDocument();
    const timeline = screen.getByRole('list', { name: 'Avance del envío' });
    expect(within(timeline).getByText('Solicitado').closest('li')).toHaveAttribute('aria-current', 'step');
    expect(within(timeline).getByText('Entregado')).toBeInTheDocument();
    expect(screen.getAllByText('$61.50').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Sucursal demo Marina').length).toBeGreaterThan(0);
    expect(screen.getByText('El seguimiento en vivo aún no está disponible')).toBeInTheDocument();
    // A record from before stored addresses: shown as legacy, never as an address.
    const locations = await screen.findByRole('region', { name: 'Ubicaciones guardadas' });
    expect(await within(locations).findByText('Envío anterior: no conserva dirección ni indicaciones.')).toBeInTheDocument();
    expect(within(locations).getByText('Sin dirección guardada')).toBeInTheDocument();
    expect(within(locations).getByText('Registro anterior')).toBeInTheDocument();
    expect(within(locations).getByText('Ubicación sin verificar')).toBeInTheDocument();
  });

  it('shows the synthetic address and instructions stored with the delivery', async () => {
    const getDeliveryLocations = vi.fn(async () => ({
      branchId: 'branch_demo_marina',
      pickup: { coordinates: { lat: 0, lng: 0 }, source: 'branch_record' as const, verification: 'unverified' as const },
      dropoff: {
        coordinates: { lat: 0.01, lng: 0.01 }, addressLine: 'Calle Sintética 123, Colonia Prueba', instructions: 'Puerta de prueba',
        source: 'synthetic' as const, verification: 'unverified' as const,
      },
    }));
    renderApp('/envios/delivery_test', { api: { getDelivery: async () => DELIVERY, getDeliveryLocations } });
    const locations = await screen.findByRole('region', { name: 'Ubicaciones guardadas' });
    expect(await within(locations).findByText('Calle Sintética 123, Colonia Prueba')).toBeInTheDocument();
    expect(within(locations).getByText('Indicaciones: Puerta de prueba')).toBeInTheDocument();
    expect(within(locations).getByText('Dirección ficticia de prueba')).toBeInTheDocument();
    expect(within(locations).getByText('Ubicación sin verificar')).toBeInTheDocument();
    expect(getDeliveryLocations).toHaveBeenCalledWith('delivery_test');
  });

  it.each([
    ['404', new ApiError('not-found', 404, 'NOT_FOUND'), 'Las ubicaciones de este envío no están disponibles', false],
    ['503', new ApiError('unavailable', 503, 'SERVICE_UNAVAILABLE'), 'No pudimos cargar las ubicaciones', true],
  ])('keeps the delivery visible when its locations fail with %s', async (_name, failure, title, retry) => {
    renderApp('/envios/delivery_test', { api: { getDelivery: async () => DELIVERY, getDeliveryLocations: () => Promise.reject(failure) } });
    expect(await screen.findByText(title)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Estado del envío' })).toBeInTheDocument();
    expect(Boolean(screen.queryByRole('button', { name: /Reintentar/ }))).toBe(retry);
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
    const { user, router } = renderApp('/', { api: { getDelivery: async () => DELIVERY, getDeliveryByReference: async () => DELIVERY } });
    await user.type(await screen.findByRole('textbox', { name: /Folio del envío/ }), 'vl267k9m2q');
    await user.click(screen.getByRole('button', { name: /Ver estado/ }));
    expect(await screen.findByRole('heading', { name: 'Estado del envío' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/envios/delivery_test');
  });

  it('validates typed folios, normalizes them and resolves through authenticated lookup before UUID navigation', async () => {
    const getDeliveryByReference = vi.fn().mockResolvedValue(DELIVERY);
    const { user, router } = renderApp('/', { api: { getDeliveryByReference, getDelivery: async () => DELIVERY } });
    const input = await screen.findByRole('textbox', { name: /Folio del envío/ });
    await user.type(input, 'VL-26-7K9');
    await user.click(screen.getByRole('button', { name: /Ver estado/ }));
    expect(await screen.findByText(/Escribe el folio completo/)).toBeInTheDocument();
    expect(getDeliveryByReference).not.toHaveBeenCalled();
    await user.clear(input);
    await user.type(input, 'vl267k9m2q');
    await user.click(screen.getByRole('button', { name: /Ver estado/ }));
    expect(await screen.findByRole('heading', { name: 'Estado del envío' })).toBeInTheDocument();
    expect(getDeliveryByReference).toHaveBeenCalledWith('VL-26-7K9M2Q');
    expect(router.state.location.pathname).toBe('/envios/delivery_test');
  });

  it.each([
    [new ApiError('not-found', 404), 'Puede que el folio esté mal escrito o que pertenezca a otra sucursal.'],
    [new ApiError('unavailable', 503), 'Estamos teniendo problemas para conectar. Intenta de nuevo en unos minutos.'],
  ])('keeps the search editable after lookup failure', async (failure, message) => {
    const { user, router } = renderApp('/', { api: { getDeliveryByReference: () => Promise.reject(failure) } });
    await user.type(await screen.findByRole('textbox', { name: /Folio del envío/ }), 'VL-26-7K9M2Q');
    await user.click(screen.getByRole('button', { name: /Ver estado/ }));
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Folio del envío/ })).toBeEnabled();
    expect(router.state.location.pathname).toBe('/');
  });
});
