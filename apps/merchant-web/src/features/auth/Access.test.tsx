import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../api/api-error.ts';
import { DEMO_EMAILS, demoMe } from '../../demo/demo-fixtures.ts';
import { renderApp } from '../../test/render-app.tsx';

describe('sign-in and access', () => {
  it('sends visitors without a session to the sign-in screen', async () => {
    const { router } = renderApp('/envios/nuevo', { signedIn: false });
    expect(await screen.findByRole('heading', { name: 'Inicia sesión' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/acceso');
  });

  it('signs in, asks for a branch and lands on the requested page', async () => {
    const { user, router } = renderApp('/envios/nuevo', { signedIn: false, branchId: null });
    await screen.findByRole('heading', { name: 'Inicia sesión' });
    await user.type(screen.getByRole('textbox', { name: /Correo electrónico/ }), DEMO_EMAILS.ok);
    await user.type(screen.getByLabelText(/^Contraseña/), 'cualquiera');
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(await screen.findByRole('heading', { name: '¿Desde qué sucursal trabajas?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Continuar/ })).toBeDisabled();
    await user.click(screen.getByRole('radio', { name: /Sucursal demo Marina/ }));
    await user.click(screen.getByRole('button', { name: /Continuar/ }));

    expect(await screen.findByRole('heading', { name: 'Nuevo envío' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/envios/nuevo');
  });

  it('explains a failed sign-in without leaving the form', async () => {
    const auth = { signIn: vi.fn().mockRejectedValue(new ApiError('unauthenticated', 400, 'INVALID_CREDENTIALS')) };
    const { user } = renderApp('/acceso', { signedIn: false, auth });
    await user.type(await screen.findByRole('textbox', { name: /Correo electrónico/ }), 'alguien@demo.test');
    await user.type(screen.getByLabelText(/^Contraseña/), 'mala');
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos iniciar sesión');
  });

  it('shows access denied when the account has no merchant permission', async () => {
    renderApp('/', { api: { getMe: () => Promise.reject(new ApiError('forbidden', 403, 'ACCESS_DENIED')) } });
    expect(await screen.findByText('Tu cuenta no tiene acceso al panel de comercios')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Usar otra cuenta/ })).toBeInTheDocument();
  });

  it('shows an empty state when the account has no branch yet', async () => {
    renderApp('/', { api: { getMe: async () => ({ subjectId: '00000000-0000-4000-8000-000000000009', memberships: [] }) } });
    expect(await screen.findByText('Aún no tienes una sucursal asignada')).toBeInTheDocument();
  });

  it('offers a retry when the service is down', async () => {
    const getMe = vi.fn().mockRejectedValueOnce(new ApiError('unavailable', 503)).mockResolvedValue(demoMe);
    const { user } = renderApp('/', { api: { getMe } });
    await user.click(await screen.findByRole('button', { name: /Reintentar/ }));
    expect(await screen.findByRole('heading', { name: 'Envíos de tu sucursal' })).toBeInTheDocument();
    expect(getMe).toHaveBeenCalledTimes(2);
  });

  it('ends the session and says why when the token is rejected', async () => {
    const { router } = renderApp('/', { api: { getMe: () => Promise.reject(new ApiError('unauthenticated', 401, 'UNAUTHENTICATED')) } });
    expect(await screen.findByText('Tu sesión terminó')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/acceso');
    expect(sessionStorage.getItem('volon-merchant-session')).toBeNull();
  });

  it('renders a not-found page for unknown paths', async () => {
    renderApp('/no-existe');
    expect(await screen.findByText('Esta página no existe')).toBeInTheDocument();
  });
});
