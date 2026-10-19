import type { CourierAccountApi } from '../ports/courier-account.ts';
import { LocalBanner, ModeBannerProvider } from '../ui/ModeBanner.tsx';
import { LocalNavigator } from './LocalNavigator.tsx';
import { LocalSessionProvider } from './LocalSessionProvider.tsx';

/** Local-lab wiring; shared by the app and the screen tests (which pass a fake API). */
export function LocalShell({ api }: { api: CourierAccountApi }) {
  return (
    <ModeBannerProvider banner={<LocalBanner />}>
      <LocalSessionProvider api={api}>
        <LocalNavigator />
      </LocalSessionProvider>
    </ModeBannerProvider>
  );
}
