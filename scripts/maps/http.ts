import { EvaluationFailure, type FailureCode } from './types.ts';

export interface EvaluationHttpOptions {
  readonly fetcher: typeof fetch;
  readonly timeoutMs?: number;
  readonly retries?: number;
  readonly maxRequests?: number;
  readonly pause?: (ms: number) => Promise<void>;
}

/** No error includes a URL, credentials or provider response. No default network transport. */
export function createEvaluationHttp(options: EvaluationHttpOptions) {
  const timeout = options.timeoutMs ?? 3000;
  const retries = options.retries ?? 0;
  const maximum = options.maxRequests ?? 100;
  if (!Number.isSafeInteger(timeout) || timeout < 1 || timeout > 30000
    || !Number.isInteger(retries) || retries < 0 || retries > 1
    || !Number.isInteger(maximum) || maximum < 1 || maximum > 1000) throw new Error('Invalid evaluation HTTP configuration');
  let requests = 0;
  return async (url: URL, init: RequestInit = {}): Promise<{ body: unknown; attempts: number }> => {
    for (let attempt = 1; attempt <= retries + 1; attempt++) {
      if (requests >= maximum) throw new EvaluationFailure('quota', attempt - 1);
      requests++;
      const controller = new AbortController();
      let timer: ReturnType<typeof setTimeout> | undefined;
      let retryDelay = 0;
      try {
        const timeoutPromise = new Promise<never>((_resolve, reject) => {
          timer = setTimeout(() => { controller.abort(); reject(new EvaluationFailure('timeout')); }, timeout);
        });
        const operation = async () => {
          const response = await options.fetcher(url, { ...init, redirect: 'error', signal: controller.signal });
          if (!response.ok) {
            const retryAfter = response.headers.get('retry-after');
            retryDelay = retryAfter === null ? 0 : Number(retryAfter) * 1000;
            // Unknown HTTP-date or delays beyond the bounded evaluation budget are not retried.
            if (!Number.isFinite(retryDelay) || retryDelay < 0 || retryDelay > 1000) retryDelay = -1;
            const code: FailureCode = [401, 403].includes(response.status) ? 'auth'
              : response.status === 429 ? 'quota' : response.status >= 500 ? 'unavailable' : 'invalid_response';
            await response.body?.cancel();
            throw new EvaluationFailure(code);
          }
          const reader = response.body?.getReader();
          if (!reader) throw new EvaluationFailure('invalid_response');
          const chunks: Uint8Array[] = [];
          let size = 0;
          try {
            while (true) {
              const chunk = await reader.read();
              if (chunk.done) break;
              size += chunk.value.length;
              if (size > 1048576) throw new EvaluationFailure('invalid_response');
              chunks.push(chunk.value);
            }
            try { return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown; }
            catch { throw new EvaluationFailure('invalid_response'); }
          } finally { await reader.cancel().catch(() => undefined); }
        };
        const body = await Promise.race([operation(), timeoutPromise]);
        return { body, attempts: attempt };
      } catch (error) {
        const code = error instanceof EvaluationFailure ? error.code : controller.signal.aborted ? 'timeout' : 'network';
        if (attempt > retries || retryDelay < 0 || !['network', 'quota', 'unavailable'].includes(code)) {
          throw new EvaluationFailure(code, attempt);
        }
      } finally { if (timer !== undefined) clearTimeout(timer); }
      await (options.pause ?? ((ms) => new Promise<void>((resolve) => setTimeout(resolve, ms))))(retryDelay);
    }
    throw new EvaluationFailure('unavailable');
  };
}
export type EvaluationHttp = ReturnType<typeof createEvaluationHttp>;
