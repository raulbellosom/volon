import { act, fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createFakeCourierApi, FAKE_EMAIL, FAKE_PASSWORD } from '../test/fake-courier-api.ts';
import { ThemeProvider } from '../theme/ThemeProvider.tsx';
import { LocalShell } from './LocalShell.tsx';

function renderLocal() {
  const fake = createFakeCourierApi();
  const user = userEvent.setup();
  render(
    <SafeAreaProvider>
      <ThemeProvider initialPreference="light">
        <LocalShell api={fake.api} />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
  return { fake, user };
}

async function signIn({ user }: ReturnType<typeof renderLocal>, password = FAKE_PASSWORD) {
  await user.type(await screen.findByLabelText('Correo'), FAKE_EMAIL);
  await user.type(screen.getByLabelText('Contraseña'), password);
  await user.press(screen.getByRole('button', { name: 'Iniciar sesión' }));
}

const availability = () => screen.findByRole('header', { name: /^(Disponible|No disponible)$/ });

describe('local mode: identity and availability', () => {
  it('signs in and shows only the authorized server facts', async () => {
    const app = renderLocal();
    expect(screen.getByText('Modo local · laboratorio, solo identidad y disponibilidad')).toBeOnTheScreen();
    await signIn(app);
    expect(await availability()).toHaveTextContent('No disponible');
    expect(screen.getByLabelText('Identificador de repartidor: courier_test_a')).toBeOnTheScreen();
    expect(screen.getByLabelText('Versión: 1')).toBeOnTheScreen();
    expect(screen.getByLabelText(/^Último cambio \(hora del servidor\): /)).toBeOnTheScreen();
  });

  it('rejects wrong credentials without leaving the sign-in screen', async () => {
    const app = renderLocal();
    await signIn(app, 'wrong-password');
    expect(await screen.findByText('No pudimos iniciar sesión')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeOnTheScreen();
  });

  it('changes availability with the server version and a fresh key per command', async () => {
    const app = renderLocal();
    await signIn(app);
    await app.user.press(await screen.findByRole('button', { name: 'Ponerme disponible' }));
    expect(await screen.findByRole('header', { name: 'Disponible' })).toBeOnTheScreen();
    expect(screen.getByLabelText('Versión: 2')).toBeOnTheScreen();
    await app.user.press(screen.getByRole('button', { name: 'Dejar de estar disponible' }));
    expect(await screen.findByRole('header', { name: 'No disponible' })).toBeOnTheScreen();

    const commands = app.fake.calls.filter((call) => call.method === 'setAvailability');
    expect(commands.map((call) => call.request)).toEqual([{ status: 'available', expectedVersion: 1 }, { status: 'offline', expectedVersion: 2 }]);
    expect(commands[0]!.key).not.toBe(commands[1]!.key);
  });

  it('sends one command for a double press', async () => {
    const app = renderLocal();
    await signIn(app);
    const button = await screen.findByRole('button', { name: 'Ponerme disponible' });
    fireEvent.press(button);
    fireEvent.press(button);
    await screen.findByRole('header', { name: 'Disponible' });
    expect(app.fake.calls.filter((call) => call.method === 'setAvailability')).toHaveLength(1);
  });

  it('retries a lost reply with the same key and confirms the result with a fresh read', async () => {
    const app = renderLocal();
    await signIn(app);
    app.fake.failNext('lost-reply');
    await app.user.press(await screen.findByRole('button', { name: 'Ponerme disponible' }));
    expect(await screen.findByText('El servidor tardó demasiado')).toBeOnTheScreen();
    // The server did apply it; the screen still shows the last confirmed state until the retry.
    expect(app.fake.current().availability.status).toBe('available');

    const readsBefore = app.fake.calls.filter((call) => call.method === 'getMe').length;
    await app.user.press(screen.getByRole('button', { name: 'Reintentar el mismo cambio' }));
    expect(await screen.findByRole('header', { name: 'Disponible' })).toBeOnTheScreen();
    const commands = app.fake.calls.filter((call) => call.method === 'setAvailability');
    expect(commands).toHaveLength(2);
    expect(commands[1]!.key).toBe(commands[0]!.key);
    expect(app.fake.calls.filter((call) => call.method === 'getMe').length).toBe(readsBefore + 1);
    expect(screen.getByLabelText('Versión: 2')).toBeOnTheScreen();
  });

  it('shows the current server state after a stale-version conflict', async () => {
    const app = renderLocal();
    await signIn(app);
    await screen.findByRole('button', { name: 'Ponerme disponible' });
    app.fake.changeElsewhere('available');
    await app.user.press(screen.getByRole('button', { name: 'Ponerme disponible' }));
    expect(await screen.findByText('Tu disponibilidad cambió en otro lugar')).toBeOnTheScreen();
    expect(await screen.findByRole('header', { name: 'Disponible' })).toBeOnTheScreen();
    expect(screen.getByLabelText('Versión: 2')).toBeOnTheScreen();
  });

  it.each([
    ['offline', 'Sin conexión con el laboratorio'],
    ['unavailable', 'El servicio no responde'],
  ] as const)('keeps the state and offers a retry when %s', async (kind, title) => {
    const app = renderLocal();
    await signIn(app);
    app.fake.failNext(kind);
    await app.user.press(await screen.findByRole('button', { name: 'Ponerme disponible' }));
    expect(await screen.findByText(title)).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'No disponible' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Reintentar el mismo cambio' })).toBeOnTheScreen();
  });

  it('ends the session when the account is revoked', async () => {
    const app = renderLocal();
    await signIn(app);
    await screen.findByRole('button', { name: 'Ponerme disponible' });
    app.fake.revoke();
    await app.user.press(screen.getByRole('button', { name: 'Ponerme disponible' }));
    expect(await screen.findByText('Tu cuenta no está habilitada')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeOnTheScreen();
  });

  it('returns to sign-in with a notice when the token is rejected', async () => {
    const app = renderLocal();
    await signIn(app);
    await screen.findByRole('button', { name: 'Ponerme disponible' });
    app.fake.failNext('unauthenticated');
    await app.user.press(screen.getByRole('button', { name: 'Actualizar estado' }));
    expect(await screen.findByText('Tu sesión terminó')).toBeOnTheScreen();
  });

  it('shows a load error with retry when the profile cannot be read', async () => {
    const app = renderLocal();
    app.fake.failNextRead('timeout');
    await signIn(app);
    expect(await screen.findByText('El servidor tardó demasiado')).toBeOnTheScreen();
    await app.user.press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await availability()).toHaveTextContent('No disponible');
  });

  it('signs out and forgets the session', async () => {
    const app = renderLocal();
    await signIn(app);
    await app.user.press(await screen.findByRole('button', { name: 'Cerrar sesión' }));
    expect(await screen.findByRole('button', { name: 'Iniciar sesión' })).toBeOnTheScreen();
    expect(screen.queryByText('courier_test_a')).not.toBeOnTheScreen();
  });

  it('never shows offers or deliveries, demo or otherwise', async () => {
    const app = renderLocal();
    await signIn(app);
    await app.user.press(await screen.findByRole('button', { name: 'Ofertas y entregas' }));
    expect(await screen.findByText('Ofertas y entregas aún no conectadas')).toBeOnTheScreen();
    expect(screen.queryByText(/DEMO-10/)).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Aceptar oferta' })).not.toBeOnTheScreen();
    await act(async () => undefined);
  });
});
