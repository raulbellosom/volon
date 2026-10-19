import { createContext, use, useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { AccountError, type AccountErrorKind, type CourierAccountApi, type CourierSession } from '../ports/courier-account.ts';

export type SignOutReason = 'expired' | 'not-enabled' | null;

interface LocalSessionValue {
  readonly api: CourierAccountApi;
  readonly session: CourierSession | null;
  readonly signOutReason: SignOutReason;
  readonly signIn: { readonly pending: boolean; readonly error: AccountErrorKind | null };
  submit(email: string, password: string): Promise<void>;
  signOut(reason?: SignOutReason): void;
}

const LocalSessionContext = createContext<LocalSessionValue | null>(null);

/**
 * Local-lab session held only in React state: never written to disk, so closing the app ends it.
 * Sign-in sends the typed credentials straight to Supabase Auth and keeps nothing but the token.
 */
export function LocalSessionProvider({ api, children }: { api: CourierAccountApi; children: ReactNode }) {
  const [session, setSession] = useState<CourierSession | null>(null);
  const [signOutReason, setSignOutReason] = useState<SignOutReason>(null);
  const [signIn, setSignIn] = useState<LocalSessionValue['signIn']>({ pending: false, error: null });
  const inFlight = useRef(false);

  const submit = useCallback(async (email: string, password: string) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setSignIn({ pending: true, error: null });
    try {
      const next = await api.signIn(email.trim(), password);
      setSignOutReason(null);
      setSession(next);
      setSignIn({ pending: false, error: null });
    } catch (error) {
      setSignIn({ pending: false, error: error instanceof AccountError ? error.kind : 'unexpected' });
    } finally {
      inFlight.current = false;
    }
  }, [api]);

  const signOut = useCallback((reason: SignOutReason = null) => {
    setSession(null);
    setSignOutReason(reason);
  }, []);

  const value = useMemo<LocalSessionValue>(() => ({ api, session, signOutReason, signIn, submit, signOut }), [api, session, signOutReason, signIn, submit, signOut]);
  return <LocalSessionContext value={value}>{children}</LocalSessionContext>;
}

export function useLocalSession(): LocalSessionValue {
  const value = use(LocalSessionContext);
  if (!value) throw new Error('useLocalSession must be used inside <LocalSessionProvider>.');
  return value;
}
