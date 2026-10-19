import { useCallback, useEffect, useRef, useState } from 'react';
import { type ApiError, toApiError } from '../../api/api-error.ts';
import type { DeliveryResponse, MerchantApi } from '../../api/merchant-api.ts';

export const HISTORY_PAGE_SIZE = 20;

export type HistoryState =
  | { status: 'loading' }
  | { status: 'error'; error: ApiError }
  | {
    status: 'ready';
    items: readonly DeliveryResponse[];
    nextCursor: string | null;
    /** State of the «Cargar más» request; the loaded items stay visible if it fails. */
    more: { status: 'idle' } | { status: 'loading' } | { status: 'error'; error: ApiError };
  };

/** Appends a page, skipping deliveries already listed (a repeated row must never show twice). */
export function mergePage(current: readonly DeliveryResponse[], page: readonly DeliveryResponse[]): DeliveryResponse[] {
  const seen = new Set(current.map((delivery) => delivery.deliveryId));
  return [...current, ...page.filter((delivery) => !seen.has(delivery.deliveryId) && seen.add(delivery.deliveryId))];
}

/**
 * Cursor-paged history of one branch. Mount it with a `key` per user and branch so switching
 * either one starts from scratch; every answer is also checked against the latest request, so a
 * late response from a previous load or reload is dropped instead of mixed in.
 */
export function useDeliveryHistory(api: MerchantApi, branchId: string, pageSize: number = HISTORY_PAGE_SIZE) {
  const [state, setState] = useState<HistoryState>({ status: 'loading' });
  const latest = useRef(0);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const reload = useCallback(async () => {
    const request = ++latest.current;
    setState({ status: 'loading' });
    try {
      const page = await api.listDeliveries({ branchId, limit: pageSize, cursor: null });
      if (!alive.current || request !== latest.current) return;
      setState({ status: 'ready', items: mergePage([], page.items), nextCursor: page.nextCursor, more: { status: 'idle' } });
    } catch (error) {
      if (alive.current && request === latest.current) setState({ status: 'error', error: toApiError(error) });
    }
  }, [api, branchId, pageSize]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const loadMore = useCallback(async () => {
    if (state.status !== 'ready' || !state.nextCursor || state.more.status === 'loading') return;
    const request = latest.current;
    const cursor = state.nextCursor;
    const settle = (update: (current: Extract<HistoryState, { status: 'ready' }>) => HistoryState) =>
      setState((current) => (alive.current && request === latest.current && current.status === 'ready' ? update(current) : current));

    settle((current) => ({ ...current, more: { status: 'loading' } }));
    try {
      const page = await api.listDeliveries({ branchId, limit: pageSize, cursor });
      // A cursor that points back to itself would loop forever; treat it as the end.
      const nextCursor = page.nextCursor === cursor ? null : page.nextCursor;
      settle((current) => ({ ...current, items: mergePage(current.items, page.items), nextCursor, more: { status: 'idle' } }));
    } catch (error) {
      settle((current) => ({ ...current, more: { status: 'error', error: toApiError(error) } }));
    }
  }, [api, branchId, pageSize, state]);

  return { state, reload, loadMore };
}
