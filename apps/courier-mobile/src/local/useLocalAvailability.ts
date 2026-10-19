import { useCallback, useEffect, useRef, useState } from 'react';
import { AccountError, isRetryable, type AccountErrorKind, type CourierAvailabilityStatus, type CourierMeResponse } from '../ports/courier-account.ts';
import { useLocalSession } from './LocalSessionProvider.tsx';

export type AvailabilityNotice =
  /** Someone else changed it first; the server state is shown instead. */
  | { kind: 'version-conflict' }
  /** The command outcome is unknown; retrying reuses the same key. */
  | { kind: 'retry'; error: AccountErrorKind; target: CourierAvailabilityStatus }
  | { kind: 'error'; error: AccountErrorKind };

export interface AvailabilityState {
  readonly status: 'loading' | 'ready' | 'error';
  readonly me: CourierMeResponse | null;
  readonly loadError: AccountErrorKind | null;
  readonly pending: boolean;
  readonly notice: AvailabilityNotice | null;
}

interface PendingCommand {
  readonly target: CourierAvailabilityStatus;
  readonly expectedVersion: number;
  readonly key: string;
}

let sequence = 0;
/** Unique enough for one courier's commands; matches the contract's [A-Za-z0-9_-]{1,128}. */
export const newIdempotencyKey = () => `courier-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}-${(sequence += 1)}`;

/**
 * Reads and changes the courier availability. Guarantees:
 * - one command at a time (a second press is ignored while pending);
 * - an unknown outcome (offline, timeout, 503) is retried with the same key and expected version;
 * - after a retried command or a 409 the screen shows a fresh GET, because a replayed receipt can
 *   be historical and must not be taken as the current state;
 * - 401 ends the session as expired, 404 as an account that is not enabled.
 */
export function useLocalAvailability(newKey: () => string = newIdempotencyKey) {
  const { api, session, signOut } = useLocalSession();
  const [state, setState] = useState<AvailabilityState>({ status: 'loading', me: null, loadError: null, pending: false, notice: null });
  const inFlight = useRef(false);
  const pendingCommand = useRef<PendingCommand | null>(null);

  const fail = useCallback((kind: AccountErrorKind): boolean => {
    if (kind === 'unauthenticated') signOut('expired');
    else if (kind === 'not-enabled') signOut('not-enabled');
    else return false;
    return true;
  }, [signOut]);

  const load = useCallback(async (keepNotice = false) => {
    if (!session) return;
    setState((current) => ({ ...current, status: current.me ? current.status : 'loading', loadError: null, ...(keepNotice ? {} : { notice: null }) }));
    try {
      const me = await api.getMe(session);
      setState((current) => ({ ...current, status: 'ready', me, loadError: null }));
    } catch (error) {
      const kind = error instanceof AccountError ? error.kind : 'unexpected';
      if (!fail(kind)) setState((current) => ({ ...current, status: current.me ? 'ready' : 'error', loadError: kind }));
    }
  }, [api, session, fail]);

  useEffect(() => {
    void load();
  }, [load]);

  const change = useCallback(async (target: CourierAvailabilityStatus) => {
    const me = state.me;
    if (!session || !me || inFlight.current) return;
    inFlight.current = true;
    const previous = pendingCommand.current;
    const retry = previous !== null && previous.target === target && previous.expectedVersion === me.availability.version;
    const command: PendingCommand = retry && previous ? previous : { target, expectedVersion: me.availability.version, key: newKey() };
    pendingCommand.current = command;
    setState((current) => ({ ...current, pending: true, notice: null }));
    try {
      const result = await api.setAvailability(session, { status: target, expectedVersion: command.expectedVersion }, command.key);
      pendingCommand.current = null;
      setState((current) => ({ ...current, pending: false, me: result }));
      // A retried key may answer with the original (historical) receipt: confirm with the server.
      if (retry) await load(true);
    } catch (error) {
      const kind = error instanceof AccountError ? error.kind : 'unexpected';
      setState((current) => ({ ...current, pending: false }));
      if (fail(kind)) return;
      if (isRetryable(kind)) {
        setState((current) => ({ ...current, notice: { kind: 'retry', error: kind, target } }));
        return;
      }
      pendingCommand.current = null;
      if (kind === 'version-conflict' || kind === 'idempotency-conflict') {
        setState((current) => ({ ...current, notice: { kind: 'version-conflict' } }));
        await load(true);
        return;
      }
      setState((current) => ({ ...current, notice: { kind: 'error', error: kind } }));
    } finally {
      inFlight.current = false;
    }
  }, [api, session, state.me, newKey, fail, load]);

  return { state, reload: () => void load(), change };
}
