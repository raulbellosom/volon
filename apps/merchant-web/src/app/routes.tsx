import type { RouteObject } from 'react-router';
import { LoginPage } from '../features/auth/LoginPage.tsx';
import { BranchSelectPage } from '../features/branches/BranchSelectPage.tsx';
import { NewDeliveryPage } from '../features/delivery-request/NewDeliveryPage.tsx';
import { DeliveryStatusPage } from '../features/delivery-status/DeliveryStatusPage.tsx';
import { HomePage } from '../features/home/HomePage.tsx';
import { NotFoundPage } from '../features/NotFoundPage.tsx';
import { ProtectedLayout } from './ProtectedLayout.tsx';
import { RootLayout } from './RootLayout.tsx';

/** Spanish, human-readable paths; see the app README for the full list. */
export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    children: [
      { path: '/acceso', element: <LoginPage /> },
      {
        element: <ProtectedLayout />,
        children: [
          { index: true, element: <HomePage /> },
          { path: '/sucursal', element: <BranchSelectPage /> },
          { path: '/envios/nuevo', element: <NewDeliveryPage /> },
          { path: '/envios/:deliveryId', element: <DeliveryStatusPage /> },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
