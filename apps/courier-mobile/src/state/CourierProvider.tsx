import { createContext, use, useCallback, useMemo, useReducer, useRef, type ReactNode } from 'react';
import { GatewayError, type CourierGateway, type GatewayErrorKind } from '../ports/courier-gateway.ts';
import { courierReducer, initialState, type CourierState, type OfferCommand } from './courier-store.ts';

export interface CourierActions {
  signIn(): Promise<void>;
  signOut(): void;
  setAvailability(available: boolean): Promise<void>;
  loadOffers(): Promise<void>;
  respond(offerId: string, command: OfferCommand): Promise<void>;
  advance(): Promise<void>;
  closeDelivery(): void;
}

interface CourierValue {
  readonly state: CourierState;
  readonly actions: CourierActions;
  /** Device clock; injected so tests control countdowns. */
  readonly now: () => number;
}

const CourierContext = createContext<CourierValue | null>(null);

const kindOf = (error: unknown): GatewayErrorKind => (error instanceof GatewayError ? error.kind : 'unavailable');

let sequence = 0;
const newKey = () => `demo-${Date.now().toString(36)}-${(sequence += 1)}`;

/**
 * Runs commands against the gateway. Two guards make repeated presses harmless:
 * `inFlight` drops a second press synchronously, and `keys` reuses the same idempotency key
 * when a failed command is retried, so the gateway answers it at most once.
 */
export function CourierProvider({ gateway, now = Date.now, children }: { gateway: CourierGateway; now?: () => number; children: ReactNode }) {
  const [state, dispatch] = useReducer(courierReducer, initialState);
  const stateRef = useRef(state);
  stateRef.current = state;
  const inFlight = useRef(new Set<string>());
  const keys = useRef(new Map<string, string>());

  const run = useCallback(async (command: string, work: (key: string) => Promise<void>, onError: (kind: GatewayErrorKind) => void) => {
    if (inFlight.current.has(command)) return;
    inFlight.current.add(command);
    const key = keys.current.get(command) ?? newKey();
    keys.current.set(command, key);
    try {
      await work(key);
      keys.current.delete(command);
    } catch (error) {
      const kind = kindOf(error);
      // Only an unknown outcome is worth retrying with the same key; anything else is settled.
      if (kind !== 'offline' && kind !== 'unavailable') keys.current.delete(command);
      onError(kind);
    } finally {
      inFlight.current.delete(command);
    }
  }, []);

  const loadOffers = useCallback(async () => {
    dispatch({ type: 'inbox/start' });
    try {
      const inbox = await gateway.listOffers();
      dispatch({ type: 'inbox/done', offers: inbox.offers, serverOffsetMs: Date.parse(inbox.serverTime) - now() });
    } catch (error) {
      dispatch({ type: 'inbox/fail', error: kindOf(error) });
    }
  }, [gateway, now]);

  const actions = useMemo<CourierActions>(() => ({
    signIn: () => run('sign-in', async () => {
      dispatch({ type: 'signIn/start' });
      dispatch({ type: 'signIn/done', identity: await gateway.signIn() });
    }, (error) => dispatch({ type: 'signIn/fail', error })),
    signOut: () => {
      keys.current.clear();
      dispatch({ type: 'signOut' });
    },
    setAvailability: (available) => run('shift', async () => {
      dispatch({ type: 'shift/start' });
      const shift = await gateway.setAvailability(available);
      dispatch({ type: 'shift/done', shift });
      if (shift === 'available') await loadOffers();
    }, (error) => dispatch({ type: 'shift/fail', error })),
    loadOffers,
    respond: (offerId, command) => run(`offer:${offerId}`, async (key) => {
      dispatch({ type: 'offer/start', offerId, command });
      if (command === 'accept') dispatch({ type: 'offer/accepted', offerId, active: await gateway.acceptOffer(offerId, key) });
      else {
        await gateway.declineOffer(offerId, key);
        dispatch({ type: 'offer/declined', offerId });
      }
    }, (error) => dispatch({ type: 'offer/fail', offerId, error })),
    advance: () => {
      const active = stateRef.current.active;
      if (!active) return Promise.resolve();
      return run(`step:${active.assignmentId}:${active.stage}`, async (key) => {
        dispatch({ type: 'step/start' });
        dispatch({ type: 'step/done', active: await gateway.advance(active.assignmentId, active.stage, key) });
      }, (error) => dispatch({ type: 'step/fail', error }));
    },
    closeDelivery: () => dispatch({ type: 'delivery/close' }),
  }), [gateway, run, loadOffers]);

  const value = useMemo(() => ({ state, actions, now }), [state, actions, now]);
  return <CourierContext value={value}>{children}</CourierContext>;
}

export function useCourier(): CourierValue {
  const value = use(CourierContext);
  if (!value) throw new Error('useCourier must be used inside <CourierProvider>.');
  return value;
}
