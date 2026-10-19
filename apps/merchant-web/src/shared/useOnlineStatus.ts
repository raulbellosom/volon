import { useSyncExternalStore } from 'react';

function subscribe(onChange: () => void): () => void {
  globalThis.addEventListener('online', onChange);
  globalThis.addEventListener('offline', onChange);
  return () => {
    globalThis.removeEventListener('online', onChange);
    globalThis.removeEventListener('offline', onChange);
  };
}

/** Browser connectivity as reported by `navigator.onLine` (a hint, not a guarantee). */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
}
