import { useCallback, useRef, useState } from 'react';
import { ApiError, toApiError } from '../../api/api-error.ts';
import type { DeliveryLocationsResponse, DeliveryQuoteResponse, DeliveryResponse, MerchantApi, PickupLocationResponse } from '../../api/merchant-api.ts';
import type { LocationSource } from '../../geo/location-source.ts';
import { buildQuoteRequest } from './destination-input.ts';

export const REQUEST_STEPS = ['origin', 'destination', 'quote', 'done'] as const;
export type RequestStep = (typeof REQUEST_STEPS)[number];

/** What the server stored with the quote; shown instead of the form before confirming. */
export type SnapshotState = { status: 'loading' } | { status: 'ready'; locations: DeliveryLocationsResponse } | { status: 'error'; error: ApiError };

export type QuoteState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; quote: DeliveryQuoteResponse; idempotencyKey: string; snapshot: SnapshotState }
  | { status: 'error'; error: ApiError };

export type SubmitState = { status: 'idle' } | { status: 'submitting' } | { status: 'error'; error: ApiError };

export interface Destination {
  /** Synthetic address typed by the merchant; sent with the quote and stored in its snapshot. */
  address: string;
  /** Optional courier notes, stored with the same snapshot. */
  instructions: string;
}

interface Options {
  api: MerchantApi;
  locations: LocationSource | null;
  initialBranchId: string;
  newKey?: () => string;
}

/**
 * Wizard state for origin → destination → quote → confirmation. Any change to the branch or the
 * destination discards the quote, and every answer is checked against the latest request so a late
 * quote can never come back to life. One idempotency key per quote: retries reuse it, a new quote
 * gets a new one. Amounts and stored locations always come from the API.
 */
export function useDeliveryRequest({ api, locations, initialBranchId, newKey = () => crypto.randomUUID() }: Options) {
  const [step, setStep] = useState<RequestStep>('origin');
  const [branchId, setBranch] = useState(initialBranchId);
  const [destination, setDestinationState] = useState<Destination>({ address: '', instructions: '' });
  const [quote, setQuote] = useState<QuoteState>({ status: 'idle' });
  const [submit, setSubmit] = useState<SubmitState>({ status: 'idle' });
  const [delivery, setDelivery] = useState<DeliveryResponse | null>(null);
  const latest = useRef(0);

  const discardQuote = useCallback(() => {
    latest.current += 1;
    setQuote({ status: 'idle' });
    setSubmit({ status: 'idle' });
  }, []);

  const setBranchId = useCallback((id: string) => {
    setBranch(id);
    discardQuote();
  }, [discardQuote]);

  const setDestination = useCallback((next: Destination) => {
    setDestinationState(next);
    discardQuote();
  }, [discardQuote]);

  const loadSnapshot = useCallback(async (request: number, quoteId: string) => {
    const update = (snapshot: SnapshotState) =>
      setQuote((current) => (request === latest.current && current.status === 'ready' ? { ...current, snapshot } : current));
    update({ status: 'loading' });
    try {
      const stored = await api.getQuoteLocations(quoteId);
      update(stored.branchId === branchId ? { status: 'ready', locations: stored } : { status: 'error', error: new ApiError('unexpected', null, 'MALFORMED_RESPONSE') });
    } catch (error) {
      update({ status: 'error', error: toApiError(error) });
    }
  }, [api, branchId]);

  const requestQuote = useCallback(async (pickup: PickupLocationResponse | null) => {
    if (!locations || !pickup || pickup.branchId !== branchId) return;
    const body = buildQuoteRequest({ branchId, pickup: pickup.coordinates, dropoff: locations.dropoff(), ...destination });
    if (!body) return;
    const request = ++latest.current;
    setStep('quote');
    setSubmit({ status: 'idle' });
    setQuote({ status: 'loading' });
    try {
      const received = await api.createQuote(body);
      if (request !== latest.current) return;
      setQuote({ status: 'ready', quote: received, idempotencyKey: newKey(), snapshot: { status: 'loading' } });
      await loadSnapshot(request, received.quoteId);
    } catch (error) {
      if (request === latest.current) setQuote({ status: 'error', error: toApiError(error) });
    }
  }, [api, locations, branchId, destination, newKey, loadSnapshot]);

  const retrySnapshot = useCallback(() => {
    if (quote.status === 'ready') void loadSnapshot(latest.current, quote.quote.quoteId);
  }, [quote, loadSnapshot]);

  const confirm = useCallback(async () => {
    if (quote.status !== 'ready' || quote.snapshot.status !== 'ready') return;
    const request = latest.current;
    setSubmit({ status: 'submitting' });
    try {
      // Only branchId, quoteId and the key: the address already lives in the quote snapshot.
      const created = await api.createDelivery({ branchId, quoteId: quote.quote.quoteId, idempotencyKey: quote.idempotencyKey });
      if (request !== latest.current) return;
      setDelivery(created);
      setSubmit({ status: 'idle' });
      setStep('done');
    } catch (error) {
      if (request === latest.current) setSubmit({ status: 'error', error: toApiError(error) });
    }
  }, [api, branchId, quote]);

  return { step, setStep, branchId, setBranchId, destination, setDestination, quote, requestQuote, retrySnapshot, submit, confirm, delivery };
}

export type DeliveryRequestState = ReturnType<typeof useDeliveryRequest>;
