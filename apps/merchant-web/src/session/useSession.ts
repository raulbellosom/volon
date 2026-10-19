import { use } from 'react';
import { SessionContext, type SessionValue } from './SessionProvider.tsx';

export function useSession(): SessionValue {
  const value = use(SessionContext);
  if (!value) throw new Error('useSession must be used inside <SessionProvider>.');
  return value;
}
