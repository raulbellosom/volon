import { createHttpAuthApi, createHttpMerchantApi } from '../api/http-merchant-api.ts';
import type { ApiMode, AuthApi, MerchantApi } from '../api/merchant-api.ts';

export interface Services {
  readonly mode: ApiMode;
  readonly auth: AuthApi;
  createApi(getToken: () => string | null): MerchantApi;
}

/**
 * Demo fixtures exist only under `vite --mode demo` on the dev server. Both conditions are
 * compile-time constants, so a production build drops the demo module entirely.
 */
export const isDemoMode = import.meta.env.DEV && import.meta.env.MODE === 'demo';

export async function createServices(): Promise<Services> {
  if (isDemoMode) {
    const { createDemoApis } = await import('../demo/demo-api.ts');
    const { auth, api } = createDemoApis();
    return { mode: 'demo', auth, createApi: () => api };
  }
  return { mode: 'http', auth: createHttpAuthApi(), createApi: createHttpMerchantApi };
}
