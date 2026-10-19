import { ToastRegion } from '@delivery/ui-web';
import { I18nProvider, RouterProvider } from 'react-aria-components';
import { Outlet, useHref, useNavigate, type NavigateOptions } from 'react-router';

declare module 'react-aria-components' {
  interface RouterConfig {
    routerOptions: NavigateOptions;
  }
}

/** Lets every Volon UI link and button with `href` navigate through React Router. */
export function RootLayout() {
  const navigate = useNavigate();
  return (
    <I18nProvider locale="es-MX">
      <RouterProvider navigate={(path, options) => void navigate(path, options)} useHref={useHref}>
        <Outlet />
        <ToastRegion />
      </RouterProvider>
    </I18nProvider>
  );
}
