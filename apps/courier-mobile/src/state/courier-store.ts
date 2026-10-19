import type { CourierIdentity, CourierOffer, ShiftStatus } from '../domain/courier.ts';
import type { ActiveDelivery } from '../domain/workflow.ts';
import type { GatewayErrorKind } from '../ports/courier-gateway.ts';

export type OfferCommand = 'accept' | 'decline';

export interface CourierState {
  readonly identity: CourierIdentity | null;
  readonly signIn: { readonly pending: boolean; readonly error: GatewayErrorKind | null };
  readonly shift: ShiftStatus;
  readonly shiftCommand: { readonly pending: boolean; readonly error: GatewayErrorKind | null };
  readonly inbox: {
    readonly status: 'idle' | 'loading' | 'ready' | 'error';
    readonly offers: readonly CourierOffer[];
    /** Simulated server time minus device time when the inbox arrived. */
    readonly serverOffsetMs: number;
    readonly error: GatewayErrorKind | null;
  };
  /** Commands in flight per offer. */
  readonly commands: Readonly<Record<string, OfferCommand>>;
  /** Last failed command per offer (expired, conflict, offline…). */
  readonly offerErrors: Readonly<Record<string, GatewayErrorKind>>;
  readonly active: ActiveDelivery | null;
  readonly step: { readonly pending: boolean; readonly error: GatewayErrorKind | null };
}

export const initialState: CourierState = {
  identity: null,
  signIn: { pending: false, error: null },
  shift: 'offline',
  shiftCommand: { pending: false, error: null },
  inbox: { status: 'idle', offers: [], serverOffsetMs: 0, error: null },
  commands: {},
  offerErrors: {},
  active: null,
  step: { pending: false, error: null },
};

export type CourierAction =
  | { type: 'signIn/start' }
  | { type: 'signIn/done'; identity: CourierIdentity }
  | { type: 'signIn/fail'; error: GatewayErrorKind }
  | { type: 'signOut' }
  | { type: 'shift/start' }
  | { type: 'shift/done'; shift: ShiftStatus }
  | { type: 'shift/fail'; error: GatewayErrorKind }
  | { type: 'inbox/start' }
  | { type: 'inbox/done'; offers: readonly CourierOffer[]; serverOffsetMs: number }
  | { type: 'inbox/fail'; error: GatewayErrorKind }
  | { type: 'offer/start'; offerId: string; command: OfferCommand }
  | { type: 'offer/accepted'; offerId: string; active: ActiveDelivery }
  | { type: 'offer/declined'; offerId: string }
  | { type: 'offer/fail'; offerId: string; error: GatewayErrorKind }
  | { type: 'step/start' }
  | { type: 'step/done'; active: ActiveDelivery }
  | { type: 'step/fail'; error: GatewayErrorKind }
  | { type: 'delivery/close' };

const without = <T>(record: Readonly<Record<string, T>>, key: string): Record<string, T> => {
  const { [key]: _removed, ...rest } = record;
  return rest;
};

/** Pure transitions of the local demo state; no I/O here. */
export function courierReducer(state: CourierState, action: CourierAction): CourierState {
  switch (action.type) {
    case 'signIn/start': return { ...state, signIn: { pending: true, error: null } };
    case 'signIn/done': return { ...state, identity: action.identity, signIn: { pending: false, error: null } };
    case 'signIn/fail': return { ...state, signIn: { pending: false, error: action.error } };
    case 'signOut': return initialState;
    case 'shift/start': return { ...state, shiftCommand: { pending: true, error: null } };
    case 'shift/done': return {
      ...state,
      shift: action.shift,
      shiftCommand: { pending: false, error: null },
      // Going offline empties the inbox: offers belong to an available shift only.
      inbox: action.shift === 'offline' ? initialState.inbox : state.inbox,
    };
    case 'shift/fail': return { ...state, shiftCommand: { pending: false, error: action.error } };
    case 'inbox/start': return { ...state, inbox: { ...state.inbox, status: 'loading', error: null } };
    case 'inbox/done': return {
      ...state,
      inbox: { status: 'ready', offers: action.offers, serverOffsetMs: action.serverOffsetMs, error: null },
      offerErrors: {},
    };
    case 'inbox/fail': return { ...state, inbox: { ...state.inbox, status: 'error', error: action.error } };
    case 'offer/start': return {
      ...state,
      commands: { ...state.commands, [action.offerId]: action.command },
      offerErrors: without(state.offerErrors, action.offerId),
    };
    case 'offer/accepted': return {
      ...state,
      commands: without(state.commands, action.offerId),
      inbox: { ...state.inbox, offers: state.inbox.offers.filter((offer) => offer.offerId !== action.offerId) },
      active: action.active,
      shift: 'busy',
    };
    case 'offer/declined': return {
      ...state,
      commands: without(state.commands, action.offerId),
      inbox: { ...state.inbox, offers: state.inbox.offers.filter((offer) => offer.offerId !== action.offerId) },
    };
    case 'offer/fail': return {
      ...state,
      commands: without(state.commands, action.offerId),
      offerErrors: { ...state.offerErrors, [action.offerId]: action.error },
    };
    case 'step/start': return { ...state, step: { pending: true, error: null } };
    case 'step/done': return {
      ...state,
      active: action.active,
      step: { pending: false, error: null },
      shift: action.active.stage === 'delivered' ? 'available' : state.shift,
    };
    case 'step/fail': return { ...state, step: { pending: false, error: action.error } };
    case 'delivery/close': return { ...state, active: null, step: initialState.step };
  }
}
