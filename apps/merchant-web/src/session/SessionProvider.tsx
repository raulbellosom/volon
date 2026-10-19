import { createContext, useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { ApiError } from '../api/api-error.ts';
import type { MerchantApi, Session } from '../api/merchant-api.ts';
import type { Services } from '../app/services.ts';
import { loadSession, saveSession } from './session-storage.ts';

/** Why the user is looking at the sign-in screen, if not by choice. */
export type SignOutReason = 'expired' | null;

export interface SessionValue {
  readonly session: Session | null;
  readonly signOutReason: SignOutReason;
  signIn(email: string, password: string): Promise<void>;
  signOut(reason?: SignOutReason): void;
  /** Backend port; a 401 from any call ends the session. */
  readonly api: MerchantApi;
}

export const SessionContext = createContext<SessionValue | null>(null);

/** Wraps every API method so an expired or revoked token sends the user back to sign in. */
function withSessionGuard(api: MerchantApi, onUnauthenticated: () => void): MerchantApi {
  const guard = <A extends unknown[], R>(call: (...args: A) => Promise<R>) => async (...args: A): Promise<R> => {
    try {
      return await call(...args);
    } catch (error) {
      if (error instanceof ApiError && error.kind === 'unauthenticated') onUnauthenticated();
      throw error;
    }
  };
  return {
    getMe: guard(api.getMe),
    createQuote: guard(api.createQuote),
    createDelivery: guard(api.createDelivery),
    getDelivery: guard(api.getDelivery),
  };
}

export function SessionProvider({ services, children }: { services: Services; children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => loadSession());
  const [signOutReason, setSignOutReason] = useState<SignOutReason>(null);
  const sessionRef = useRef(session);
  sessionRef.current = session;

  const signOut = useCallback((reason: SignOutReason = null) => {
    saveSession(null);
    setSession(null);
    setSignOutReason(reason);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const next = await services.auth.signIn(email, password);
    saveSession(next);
    setSignOutReason(null);
    setSession(next);
  }, [services]);

  const api = useMemo(() => {
    const getToken = () => {
      const current = sessionRef.current;
      return current && current.expiresAt > Date.now() ? current.accessToken : null;
    };
    return withSessionGuard(services.createApi(getToken), () => signOut('expired'));
  }, [services, signOut]);

  const value = useMemo<SessionValue>(
    () => ({ session, signOutReason, signIn, signOut, api }),
    [session, signOutReason, signIn, signOut, api],
  );
  return <SessionContext value={value}>{children}</SessionContext>;
}
