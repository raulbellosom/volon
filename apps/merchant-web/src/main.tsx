import './styles.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { routes } from './app/routes.tsx';
import { createServices } from './app/services.ts';
import { SessionProvider } from './session/SessionProvider.tsx';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element.');

const services = await createServices();
const router = createBrowserRouter(routes);

createRoot(root).render(
  <StrictMode>
    <SessionProvider services={services}>
      <RouterProvider router={router} />
    </SessionProvider>
  </StrictMode>,
);
