import { act, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../api/api-error.ts';
import type { DeliveryHistoryQuery, DeliveryHistoryResponse, DeliveryResponse } from '../../api/merchant-api.ts';
import { renderApp } from '../../test/render-app.tsx';

function delivery(id: string, branchId = 'branch_demo_centro', minutesAgo = 10): DeliveryResponse {
  return {
    deliveryId: id, publicReference: 'VL-26-7K9M2Q', branchId, quoteId: `q_${id}`, status: 'requested', version: 1,
    createdAt: new Date(Date.now() - minutesAgo * 60_000).toISOString(),
    pricing: { amountMinor: 4500, currency: 'MXN', lines: [{ code: 'base_delivery', amountMinor: 4500 }], rateVersion: 'test' },
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

const rows = () => within(screen.getByRole('list', { name: /^Envíos de/ })).getAllByRole('link');

describe('delivery history', () => {
  it('pages through the synthetic history with «Cargar más» until the end', async () => {
    const { user } = renderApp('/');
    expect(await screen.findByRole('list', { name: 'Envíos de Sucursal demo Centro' })).toBeInTheDocument();
    expect(rows()).toHaveLength(20);
    expect(rows()[0]).toHaveAttribute('href', '/envios/delivery_demo_h01');
    expect(rows()[0]).toHaveTextContent('Solicitado');
    expect(rows()[0]).toHaveTextContent('Folio VL-26-7K9M22');
    expect(rows()[0]).not.toHaveTextContent('delivery_demo_h01');

    await user.click(screen.getByRole('button', { name: /Cargar más/ }));
    expect(await screen.findByText('No hay más envíos en esta sucursal.')).toBeInTheDocument();
    expect(rows()).toHaveLength(23);
    expect(screen.queryByRole('button', { name: /Cargar más/ })).not.toBeInTheDocument();
  });

  it('shows an empty state for a branch without deliveries', async () => {
    renderApp('/', { branchId: 'branch_demo_marina' });
    expect(await screen.findByText('Aún no hay envíos en esta sucursal')).toBeInTheDocument();
  });

  it('asks only for the active branch and never repeats a delivery across pages', async () => {
    const listDeliveries = vi.fn(async ({ cursor }: DeliveryHistoryQuery): Promise<DeliveryHistoryResponse> => (cursor
      ? { items: [delivery('d2', 'branch_demo_centro', 20), delivery('d3', 'branch_demo_centro', 30)], nextCursor: null }
      : { items: [delivery('d1'), delivery('d2', 'branch_demo_centro', 20)], nextCursor: 'c1' }));
    const { user } = renderApp('/', { api: { listDeliveries } });
    await screen.findByRole('list', { name: /^Envíos de/ });
    await user.click(screen.getByRole('button', { name: /Cargar más/ }));
    await screen.findByText('No hay más envíos en esta sucursal.');

    expect(rows().map((row) => row.getAttribute('href'))).toEqual(['/envios/d1', '/envios/d2', '/envios/d3']);
    expect(listDeliveries).toHaveBeenNthCalledWith(1, { branchId: 'branch_demo_centro', limit: 20, cursor: null });
    expect(listDeliveries).toHaveBeenLastCalledWith({ branchId: 'branch_demo_centro', limit: 20, cursor: 'c1' });
  });

  it('drops a late answer from the previous branch after switching', async () => {
    const centro = deferred<DeliveryHistoryResponse>();
    const listDeliveries = vi.fn(({ branchId }: DeliveryHistoryQuery) => (branchId === 'branch_demo_centro'
      ? centro.promise
      : Promise.resolve({ items: [delivery('marina-1', 'branch_demo_marina')], nextCursor: null })));
    const { user, router } = renderApp('/', { api: { listDeliveries } });
    await screen.findByText('Cargando envíos…');

    await act(() => router.navigate('/sucursal'));
    await user.click(await screen.findByRole('radio', { name: /Sucursal demo Marina/ }));
    await user.click(screen.getByRole('button', { name: /Continuar/ }));
    await screen.findByRole('list', { name: 'Envíos de Sucursal demo Marina' });
    await act(async () => centro.resolve({ items: [delivery('centro-1')], nextCursor: null }));

    expect(rows().map((row) => row.getAttribute('href'))).toEqual(['/envios/marina-1']);
  });

  it('forgets the history when the session ends', async () => {
    const { user } = renderApp('/');
    await screen.findByRole('list', { name: /^Envíos de/ });
    await user.click(screen.getByRole('button', { name: /menú de cuenta/ }));
    await user.click(await screen.findByRole('menuitem', { name: /Cerrar sesión/ }));
    expect(await screen.findByRole('heading', { name: 'Inicia sesión' })).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: /^Envíos de/ })).not.toBeInTheDocument();
    expect(sessionStorage.length).toBe(0);
  });

  it('sends the user to sign in on 401', async () => {
    const { router } = renderApp('/', { api: { listDeliveries: () => Promise.reject(new ApiError('unauthenticated', 401, 'UNAUTHENTICATED')) } });
    expect(await screen.findByText('Tu sesión terminó')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/acceso');
  });

  it('treats 404 as lost access to the branch, without a pointless retry', async () => {
    renderApp('/', { api: { listDeliveries: () => Promise.reject(new ApiError('not-found', 404, 'NOT_FOUND')) } });
    expect(await screen.findByText('No tienes acceso al historial de esta sucursal')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Reintentar/ })).not.toBeInTheDocument();
  });

  it.each([
    ['422', new ApiError('invalid', 422, 'INVALID_DELIVERY_HISTORY_QUERY'), 'No pudimos mostrar el historial'],
    ['503', new ApiError('unavailable', 503, 'SERVICE_UNAVAILABLE'), 'El servicio no responde'],
    ['malformed', new ApiError('unexpected', null, 'MALFORMED_RESPONSE'), 'No pudimos mostrar el historial'],
  ])('recovers from %s with a retry', async (_name, failure, title) => {
    const listDeliveries = vi.fn().mockRejectedValueOnce(failure).mockResolvedValue({ items: [delivery('ok-1')], nextCursor: null });
    const { user } = renderApp('/', { api: { listDeliveries } });
    expect(await screen.findByText(title)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Reintentar/ }));
    expect(await screen.findByRole('list', { name: /^Envíos de/ })).toBeInTheDocument();
    expect(rows()).toHaveLength(1);
  });

  it('keeps loaded rows when «Cargar más» fails and retries the same cursor', async () => {
    const listDeliveries = vi.fn()
      .mockResolvedValueOnce({ items: [delivery('d1')], nextCursor: 'c1' })
      .mockRejectedValueOnce(new ApiError('unavailable', 503))
      .mockResolvedValueOnce({ items: [delivery('d2', 'branch_demo_centro', 20)], nextCursor: null });
    const { user } = renderApp('/', { api: { listDeliveries } });
    await screen.findByRole('list', { name: /^Envíos de/ });
    await user.click(screen.getByRole('button', { name: /Cargar más/ }));
    expect(await screen.findByText('No pudimos cargar más envíos')).toBeInTheDocument();
    expect(rows()).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: /Reintentar/ }));
    await screen.findByText('No hay más envíos en esta sucursal.');
    expect(rows()).toHaveLength(2);
    expect(listDeliveries.mock.calls[2]?.[0]).toMatchObject({ cursor: 'c1' });
  });

  it('ignores a pending «Cargar más» once the list is refreshed', async () => {
    const more = deferred<DeliveryHistoryResponse>();
    const listDeliveries = vi.fn()
      .mockResolvedValueOnce({ items: [delivery('old-1')], nextCursor: 'c1' })
      .mockReturnValueOnce(more.promise)
      .mockResolvedValueOnce({ items: [delivery('new-1', 'branch_demo_centro', 1), delivery('old-1')], nextCursor: null });
    const { user } = renderApp('/', { api: { listDeliveries } });
    await screen.findByRole('list', { name: /^Envíos de/ });
    await user.click(screen.getByRole('button', { name: /Cargar más/ }));
    await user.click(screen.getByRole('button', { name: /Actualizar/ }));
    await screen.findByText('No hay más envíos en esta sucursal.');
    await act(async () => more.resolve({ items: [delivery('stale-2')], nextCursor: null }));

    expect(rows().map((row) => row.getAttribute('href'))).toEqual(['/envios/new-1', '/envios/old-1']);
  });

  it('lists a new delivery first after requesting it', async () => {
    const { user } = renderApp('/envios/nuevo');
    await user.click(await screen.findByRole('button', { name: /Continuar/ }));
    await user.type(await screen.findByRole('textbox', { name: /Dirección de prueba/ }), 'Calle sintética 1');
    await screen.findByText(/registro de la sucursal/);
    await user.click(screen.getByRole('button', { name: /Cotizar envío/ }));
    await screen.findByText('Calle sintética 1');
    await user.click(screen.getByRole('button', { name: /Confirmar envío/ }));
    await screen.findByRole('heading', { name: 'Solicitud enviada' });

    await user.click(within(screen.getByRole('navigation', { name: 'Principal' })).getByRole('link', { name: 'Inicio' }));
    await screen.findByRole('list', { name: /^Envíos de/ });
    expect(rows()[0]).toHaveAttribute('href', '/envios/delivery_demo_1');
  });
});
