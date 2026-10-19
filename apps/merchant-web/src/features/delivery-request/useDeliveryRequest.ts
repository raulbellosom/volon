import { useCallback, useState } from 'react';
import { type ApiError, toApiError } from '../../api/api-error.ts';
import type { DeliveryQuoteResponse, DeliveryResponse, MerchantApi } from '../../api/merchant-api.ts';
import type { LocationSource } from '../../geo/location-source.ts';

export const REQUEST_STEPS = ['origin', 'destination', 'quote', 'done'] as const;
export type RequestStep = (typeof REQUEST_STEPS)[number];

export type QuoteState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; quote: DeliveryQuoteResponse; idempotencyKey: string }
  | { status: 'error'; error: ApiError };

export type SubmitState = { status: 'idle' } | { status: 'submitting' } | { status: 'error'; error: ApiError };

export interface Destination {
  address: string;
  /** Notes for the courier; kept on this screen only until the contract accepts them. */
  reference: string;
}

interface Options {
  api: MerchantApi;
  locations: LocationSource | null;
  initialBranchId: string;
  newKey?: () => string;
}

/**
 * Wizard state for origin → destination → quote → confirmation. Amounts and validity always
 * come from the API; the client only shows them and keeps one idempotency key per quote so a
 * retried confirmation never creates a second delivery.
 */
export function useDeliveryRequest({ api, locations, initialBranchId, newKey = () => crypto.randomUUID() }: Options) {
  const [step, setStep] = useState<RequestStep>('origin');
  const [branchId, setBranch] = useState(initialBranchId);
  const [destination, setDestinationState] = useState<Destination>({ address: '', reference: '' });
  const [quote, setQuote] = useState<QuoteState>({ status: 'idle' });
  const [submit, setSubmit] = useState<SubmitState>({ status: 'idle' });
  const [delivery, setDelivery] = useState<DeliveryResponse | null>(null);

  const resetQuote = useCallback(() => {
    setQuote({ status: 'idle' });
    setSubmit({ status: 'idle' });
  }, []);

  const setBranchId = useCallback((id: string) => {
    setBranch(id);
    resetQuote();
  }, [resetQuote]);

  const setDestination = useCallback((next: Destination) => {
    setDestinationState(next);
    resetQuote();
  }, [resetQuote]);

  const requestQuote = useCallback(async () => {
    if (!locations) return;
    setStep('quote');
    setSubmit({ status: 'idle' });
    setQuote({ status: 'loading' });
    try {
      const { pickup, dropoff } = locations.resolve(branchId, destination.address);
      const received = await api.createQuote({ branchId, pickup, dropoff, serviceType: 'local_delivery' });
      setQuote({ status: 'ready', quote: received, idempotencyKey: newKey() });
    } catch (error) {
      setQuote({ status: 'error', error: toApiError(error) });
    }
  }, [api, locations, branchId, destination.address, newKey]);

  const confirm = useCallback(async () => {
    if (quote.status !== 'ready') return;
    setSubmit({ status: 'submitting' });
    try {
      const created = await api.createDelivery({ branchId, quoteId: quote.quote.quoteId, idempotencyKey: quote.idempotencyKey });
      setDelivery(created);
      setSubmit({ status: 'idle' });
      setStep('done');
    } catch (error) {
      setSubmit({ status: 'error', error: toApiError(error) });
    }
  }, [api, branchId, quote]);

  return { step, setStep, branchId, setBranchId, destination, setDestination, quote, requestQuote, submit, confirm, delivery };
}

export type DeliveryRequestState = ReturnType<typeof useDeliveryRequest>;
