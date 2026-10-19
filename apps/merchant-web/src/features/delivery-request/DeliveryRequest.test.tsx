import { act, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../api/api-error.ts';
import type { DeliveryLocationsResponse, DeliveryQuoteRequest, DeliveryQuoteResponse, MerchantApi } from '../../api/merchant-api.ts';
import { renderApp } from '../../test/render-app.tsx';

const QUOTE: DeliveryQuoteResponse = {
  quoteId: 'quote_test',
  expiresAt: new Date(Date.now() + 600_000).toISOString(),
  currency: 'MXN',
  amountMinor: 6150,
  lines: [{ code: 'base_delivery', amountMinor: 3500 }, { code: 'distance_delivery', amountMinor: 2650 }],
  coverage: 'eligible',
};

const STORED: DeliveryLocationsResponse = {
  branchId: 'branch_demo_centro',
  pickup: { coordinates: { lat: 0, lng: 0 }, source: 'branch_record', verification: 'unverified' },
  dropoff: {
    coordinates: { lat: 0.01, lng: 0.01 }, addressLine: 'Calle Guardada 9, Colonia Servidor', instructions: 'Portón guardado',
    source: 'synthetic', verification: 'unverified',
  },
};

const pickupAt = (lat: number) => vi.fn(async (branchId: string) => ({ branchId, coordinates: { lat, lng: 0 }, source: 'branch_record' as const, verification: 'unverified' as const }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

async function reachDestination(api: Partial<MerchantApi> = {}) {
  const app = renderApp('/envios/nuevo', { api: { getQuoteLocations: async () => STORED, ...api } });
  await app.user.click(await screen.findByRole('button', { name: /Continuar/ }));
  await screen.findByText('Ubicación obtenida del registro de la sucursal. No incluye dirección escrita.');
  return app;
}

async function typeDestination(user: ReturnType<typeof renderApp>['user'], address: string, instructions = '') {
  await user.type(screen.getByRole('textbox', { name: /Dirección de prueba/ }), address);
  if (instructions) await user.type(screen.getByRole('textbox', { name: /Indicaciones/ }), instructions);
}

describe('new delivery request', () => {
  it('quotes from the server pickup, shows the stored snapshot and confirms with branch, quote and key only', async () => {
    const getPickupLocation = pickupAt(0.000001);
    const createQuote = vi.fn<(request: DeliveryQuoteRequest) => Promise<DeliveryQuoteResponse>>().mockResolvedValue(QUOTE);
    const createDelivery = vi.fn().mockRejectedValueOnce(new ApiError('unavailable', 503));
    const { user } = await reachDestination({ getPickupLocation, createQuote, createDelivery });

    expect(getPickupLocation).toHaveBeenCalledWith('branch_demo_centro');
    expect(screen.getByText('Usa solo direcciones ficticias')).toBeInTheDocument();
    await typeDestination(user, '  Calle   Sintética 123 ', 'Puerta  de prueba');
    await user.click(screen.getByRole('button', { name: /Cotizar envío/ }));

    expect(createQuote).toHaveBeenCalledWith({
      branchId: 'branch_demo_centro',
      pickup: { lat: 0.000001, lng: 0 },
      dropoff: { lat: 0.01, lng: 0.01 },
      serviceType: 'local_delivery',
      destination: { addressLine: 'Calle Sintética 123', instructions: 'Puerta de prueba', source: 'synthetic', verification: 'unverified' },
    });
    // What the server stored is shown, not what the form says.
    const stored = await screen.findByRole('region', { name: 'Así quedó guardado con la cotización' });
    expect(await within(stored).findByText('Calle Guardada 9, Colonia Servidor')).toBeInTheDocument();
    expect(within(stored).getByText('Indicaciones: Portón guardado')).toBeInTheDocument();
    expect(within(stored).getByText('Ubicación sin verificar')).toBeInTheDocument();
    expect(screen.queryByText('Calle Sintética 123')).not.toBeInTheDocument();
    expect(screen.getByText('$61.50')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Confirmar envío/ }));
    expect(await screen.findByText('No pudimos confirmar el envío')).toBeInTheDocument();
    createDelivery.mockResolvedValueOnce({
      deliveryId: 'delivery_test', branchId: 'branch_demo_centro', quoteId: QUOTE.quoteId, status: 'requested', version: 1,
      createdAt: new Date().toISOString(), pricing: { amountMinor: QUOTE.amountMinor, currency: 'MXN', lines: QUOTE.lines, rateVersion: 'test' },
    });
    await user.click(screen.getByRole('button', { name: /Confirmar envío/ }));
    expect(await screen.findByRole('heading', { name: 'Solicitud enviada' })).toBeInTheDocument();

    const [first, retry] = createDelivery.mock.calls.map(([input]) => input as Record<string, string>);
    expect(Object.keys(first ?? {}).sort()).toEqual(['branchId', 'idempotencyKey', 'quoteId']);
    expect(retry?.idempotencyKey).toBe(first?.idempotencyKey);
    expect(screen.getByText('La dirección de prueba quedó guardada')).toBeInTheDocument();
  });

  it('discards the quote when the destination changes and uses a new key for the new quote', async () => {
    const createQuote = vi.fn().mockResolvedValueOnce(QUOTE).mockResolvedValueOnce({ ...QUOTE, quoteId: 'quote_two' });
    const createDelivery = vi.fn().mockRejectedValue(new ApiError('unavailable', 503));
    const { user } = await reachDestination({ createQuote, createDelivery });
    await typeDestination(user, 'Calle Uno 1');
    await user.click(screen.getByRole('button', { name: /Cotizar envío/ }));
    await screen.findByText('Calle Guardada 9, Colonia Servidor');
    await user.click(screen.getByRole('button', { name: /Confirmar envío/ }));
    await screen.findByText('No pudimos confirmar el envío');

    await user.click(screen.getByRole('button', { name: /Cambiar destino/ }));
    await user.type(screen.getByRole('textbox', { name: /Indicaciones/ }), 'Nueva nota');
    await user.click(screen.getByRole('button', { name: /Cotizar envío/ }));
    await screen.findByText('Calle Guardada 9, Colonia Servidor');
    await user.click(screen.getByRole('button', { name: /Confirmar envío/ }));
    await screen.findByText('No pudimos confirmar el envío');

    expect(createQuote).toHaveBeenCalledTimes(2);
    expect(createQuote.mock.calls[1]?.[0]).toMatchObject({ destination: { instructions: 'Nueva nota' } });
    const [first, second] = createDelivery.mock.calls.map(([input]) => input as Record<string, string>);
    expect(second?.quoteId).toBe('quote_two');
    expect(second?.idempotencyKey).not.toBe(first?.idempotencyKey);
  });

  it('never revives a quote that arrives after the destination changed', async () => {
    const late = deferred<DeliveryQuoteResponse>();
    const createQuote = vi.fn().mockReturnValueOnce(late.promise).mockResolvedValue(QUOTE);
    const getQuoteLocations = vi.fn(async () => STORED);
    const { user } = await reachDestination({ createQuote, getQuoteLocations });
    await typeDestination(user, 'Calle Uno 1');
    await user.click(screen.getByRole('button', { name: /Cotizar envío/ }));
    await user.click(await screen.findByRole('button', { name: /Cambiar destino/ }));
    await user.type(screen.getByRole('textbox', { name: /Dirección de prueba/ }), 'A');
    await act(async () => late.resolve(QUOTE));

    expect(getQuoteLocations).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: /Cotizar envío/ }));
    expect(createQuote).toHaveBeenCalledTimes(2);
  });

  it('re-reads the pickup for a new branch and blocks quoting while it is missing', async () => {
    const getPickupLocation = vi.fn(async (branchId: string) => {
      if (branchId === 'branch_demo_marina') throw new ApiError('not-found', 404, 'NOT_FOUND');
      return { branchId, coordinates: { lat: 0, lng: 0 }, source: 'branch_record' as const, verification: 'unverified' as const };
    });
    const { user } = await reachDestination({ getPickupLocation });
    await user.click(screen.getByRole('button', { name: /Atrás/ }));
    await user.click(screen.getByRole('radio', { name: /Sucursal demo Marina/ }));
    await user.click(screen.getByRole('button', { name: /Continuar/ }));

    expect(await screen.findByText('No pudimos obtener la ubicación de recogida')).toBeInTheDocument();
    expect(getPickupLocation).toHaveBeenLastCalledWith('branch_demo_marina');
    expect(screen.queryByRole('button', { name: /Reintentar/ })).not.toBeInTheDocument();
    await typeDestination(user, 'Calle Uno 1');
    expect(screen.getByRole('button', { name: /Cotizar envío/ })).toBeDisabled();
  });

  it('retries a pickup that failed with 503', async () => {
    const getPickupLocation = vi.fn()
      .mockRejectedValueOnce(new ApiError('unavailable', 503))
      .mockResolvedValue({ branchId: 'branch_demo_centro', coordinates: { lat: 0, lng: 0 }, source: 'branch_record', verification: 'unverified' });
    const { user } = renderApp('/envios/nuevo', { api: { getPickupLocation } });
    await user.click(await screen.findByRole('button', { name: /Continuar/ }));
    await user.click(await screen.findByRole('button', { name: /Reintentar/ }));
    expect(await screen.findByText('Ubicación obtenida del registro de la sucursal. No incluye dirección escrita.')).toBeInTheDocument();
  });

  it('validates the synthetic address before sending anything', async () => {
    const createQuote = vi.fn();
    const { user } = await reachDestination({ createQuote });
    await user.click(screen.getByRole('button', { name: /Cotizar envío/ }));
    expect(await screen.findByText('Escribe una dirección de prueba.')).toBeInTheDocument();
    await user.click(screen.getByRole('textbox', { name: /Dirección de prueba/ }));
    await user.paste('x'.repeat(241));
    expect(screen.getByText('Usa como máximo 240 caracteres; llevas 241.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Cotizar envío/ }));
    expect(createQuote).not.toHaveBeenCalled();
  });

  it('blocks confirmation until the stored snapshot can be read', async () => {
    const getQuoteLocations = vi.fn().mockRejectedValueOnce(new ApiError('unavailable', 503)).mockResolvedValue(STORED);
    const { user } = await reachDestination({ createQuote: async () => QUOTE, getQuoteLocations });
    await typeDestination(user, 'Calle Uno 1');
    await user.click(screen.getByRole('button', { name: /Cotizar envío/ }));
    expect(await screen.findByText('No pudimos leer lo que se guardó')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Confirmar envío/ })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /Reintentar/ }));
    expect(await screen.findByText('Calle Guardada 9, Colonia Servidor')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Confirmar envío/ })).toBeEnabled();
  });

  it('blocks confirmation once the quote expires and lets the merchant quote again', async () => {
    const expired = { ...QUOTE, expiresAt: new Date(Date.now() - 1000).toISOString() };
    const createQuote = vi.fn().mockResolvedValueOnce(expired).mockResolvedValueOnce(QUOTE);
    const { user } = await reachDestination({ createQuote });
    await typeDestination(user, 'Calle Uno 1');
    await user.click(screen.getByRole('button', { name: /Cotizar envío/ }));
    expect(await screen.findByText('La cotización venció')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Confirmar envío/ })).toBeDisabled();
    await user.click(screen.getAllByRole('button', { name: /Cotizar de nuevo/ })[0]!);
    expect(await screen.findByText(/Cotización válida/)).toBeInTheDocument();
    await screen.findByText('Calle Guardada 9, Colonia Servidor');
    expect(screen.getByRole('button', { name: /Confirmar envío/ })).toBeEnabled();
  });

  it.each([
    ['409 QUOTE_EXPIRED', new ApiError('quote-expired', 409, 'QUOTE_EXPIRED'), 'La cotización venció'],
    ['409 QUOTE_ALREADY_USED', new ApiError('conflict', 409, 'QUOTE_ALREADY_USED'), 'Esta cotización ya se usó o cambió. Vuelve a cotizar para solicitar otro envío.'],
  ])('handles %s on confirmation', async (_name, failure, message) => {
    const { user } = await reachDestination({ createQuote: async () => QUOTE, createDelivery: () => Promise.reject(failure) });
    await typeDestination(user, 'Calle Uno 1');
    await user.click(screen.getByRole('button', { name: /Cotizar envío/ }));
    await screen.findByText('Calle Guardada 9, Colonia Servidor');
    await user.click(screen.getByRole('button', { name: /Confirmar envío/ }));
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Confirmar envío/ })).toBeDisabled();
  });

  it.each([
    ['OUTSIDE_COVERAGE', 'El destino quedó fuera de la zona de servicio.'],
    ['INVALID_QUOTE_REQUEST', 'Revisa la dirección y las indicaciones de prueba e inténtalo de nuevo.'],
  ])('explains a 422 %s quote answer', async (code, message) => {
    const { user } = await reachDestination({ createQuote: () => Promise.reject(new ApiError('invalid', 422, code)) });
    await typeDestination(user, 'Calle Uno 1');
    await user.click(screen.getByRole('button', { name: /Cotizar envío/ }));
    expect(await screen.findByText(message)).toBeInTheDocument();
  });

  it('disables confirmation while the browser is offline', async () => {
    const { user } = await reachDestination({ createQuote: async () => QUOTE });
    await typeDestination(user, 'Calle Uno 1');
    await user.click(screen.getByRole('button', { name: /Cotizar envío/ }));
    await screen.findByText('Calle Guardada 9, Colonia Servidor');
    const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    act(() => void window.dispatchEvent(new Event('offline')));
    expect(screen.getByText('Sin conexión')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Confirmar envío/ })).toBeDisabled();
    onLine.mockRestore();
  });
});
