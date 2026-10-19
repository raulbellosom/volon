import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import type { AuthApi, MerchantApi, Session } from '../api/merchant-api.ts';
import { routes } from '../app/routes.tsx';
import type { Services } from '../app/services.ts';
import { createDemoApis } from '../demo/demo-api.ts';
import { DEMO_EMAILS } from '../demo/demo-fixtures.ts';
import { SessionProvider } from '../session/SessionProvider.tsx';
import { saveBranchId, saveSession } from '../session/session-storage.ts';

export interface RenderAppOptions {
  /** Start signed in (default) or at the sign-in screen. */
  signedIn?: boolean;
  /** Branch already chosen in this tab. */
  branchId?: string | null;
  /** Replace individual API methods to simulate backend answers. */
  api?: Partial<MerchantApi>;
  auth?: AuthApi;
  now?: () => number;
}

export const TEST_SESSION: Session = { accessToken: 'test-token', expiresAt: Date.now() + 3_600_000, email: DEMO_EMAILS.ok };

/** Renders the whole app at `path` with in-memory demo adapters and no network. */
export function renderApp(path: string, { signedIn = true, branchId = 'branch_demo_centro', api, auth, now }: RenderAppOptions = {}) {
  const demo = createDemoApis({ latencyMs: 0, ...(now ? { now } : {}) });
  const merchantApi: MerchantApi = { ...demo.api, ...api };
  const services: Services = { mode: 'demo', auth: auth ?? demo.auth, createApi: () => merchantApi };
  if (signedIn) saveSession(TEST_SESSION);
  if (branchId) saveBranchId(branchId);
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const user = userEvent.setup();
  const view = render(
    <SessionProvider services={services}>
      <RouterProvider router={router} />
    </SessionProvider>,
  );
  return { ...view, user, router, api: merchantApi };
}
