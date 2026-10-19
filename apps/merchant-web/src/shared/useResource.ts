import { useCallback, useEffect, useState } from 'react';
import { type ApiError, toApiError } from '../api/api-error.ts';

export type Resource<T> =
  | { status: 'loading'; data: null; error: null }
  | { status: 'error'; data: null; error: ApiError }
  | { status: 'ready'; data: T; error: null };

export type ResourceState<T> = Resource<T> & { reload: () => void };

/** Loads `load()` whenever `key` changes; ignores answers that arrive after a newer request. */
export function useResource<T>(key: string | null, load: () => Promise<T>): ResourceState<T> {
  const [resource, setResource] = useState<Resource<T>>({ status: 'loading', data: null, error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (key === null) return;
    let current = true;
    setResource({ status: 'loading', data: null, error: null });
    load().then(
      (data) => current && setResource({ status: 'ready', data, error: null }),
      (error: unknown) => current && setResource({ status: 'error', data: null, error: toApiError(error) }),
    );
    return () => {
      current = false;
    };
    // `load` is recreated every render on purpose; `key` and `attempt` decide when to fetch again.
  }, [key, attempt]);

  const reload = useCallback(() => setAttempt((value) => value + 1), []);
  return { ...resource, reload };
}
