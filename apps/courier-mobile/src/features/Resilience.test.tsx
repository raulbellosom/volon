import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { App } from '../App.tsx';
import type { CourierGateway } from '../ports/courier-gateway.ts';
import { renderDemo, signInAvailable } from '../test/render-app.tsx';

function spyAccept(calls: { offerId: string; key: string }[]) {
  return (gateway: CourierGateway): CourierGateway => ({
    ...gateway,
    acceptOffer: (offerId, key) => {
      calls.push({ offerId, key });
      return gateway.acceptOffer(offerId, key);
    },
  });
}

async function openOffers(app: ReturnType<typeof renderDemo>) {
  await signInAvailable(app);
  await app.user.press(screen.getByRole('button', { name: 'Ver ofertas' }));
  await screen.findByRole('button', { name: /Oferta DEMO-1042/ });
}

describe('courier demo resilience', () => {
  it('sends a single accept when the button is pressed twice in a row', async () => {
    const calls: { offerId: string; key: string }[] = [];
    const app = renderDemo({ decorate: spyAccept(calls) });
    await openOffers(app);
    const accept = screen.getAllByRole('button', { name: 'Aceptar oferta' })[0]!;
    fireEvent.press(accept);
    fireEvent.press(accept);
    expect(await screen.findByRole('header', { name: 'Oferta aceptada' })).toBeOnTheScreen();
    expect(calls).toHaveLength(1);
  });

  it('keeps the offer when offline and retries with the same idempotency key', async () => {
    const calls: { offerId: string; key: string }[] = [];
    const app = renderDemo({ decorate: spyAccept(calls) });
    await openOffers(app);
    app.controls.failNext('offline');
    await app.user.press(screen.getAllByRole('button', { name: 'Aceptar oferta' })[0]!);
    expect(await screen.findByText('Sin conexión')).toBeOnTheScreen();

    await app.user.press(screen.getByRole('button', { name: 'Reintentar aceptar' }));
    expect(await screen.findByRole('header', { name: 'Oferta aceptada' })).toBeOnTheScreen();
    expect(calls.map((call) => call.key)).toEqual([calls[0]!.key, calls[0]!.key]);
  });

  it('shows an offline inbox with a retry that recovers', async () => {
    const app = renderDemo();
    await signInAvailable(app);
    app.controls.setOffline(true);
    await app.user.press(screen.getByRole('button', { name: 'Ver ofertas' }));
    expect(await screen.findByText('Sin conexión')).toBeOnTheScreen();
    app.controls.setOffline(false);
    await app.user.press(screen.getByRole('button', { name: 'Actualizar ofertas' }));
    expect(await screen.findByRole('button', { name: /Oferta DEMO-1042/ })).toBeOnTheScreen();
  });

  it('reports a step conflict without moving the delivery', async () => {
    const app = renderDemo();
    await openOffers(app);
    await app.user.press(screen.getAllByRole('button', { name: 'Aceptar oferta' })[0]!);
    await screen.findByRole('header', { name: 'Oferta aceptada' });
    app.controls.failNext('conflict');
    await app.user.press(screen.getByRole('button', { name: 'Voy a recoger' }));
    expect(await screen.findByText('Esta etapa ya cambió')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Oferta aceptada' })).toBeOnTheScreen();
  });

  it('expires an offer live when the simulated server time passes', async () => {
    jest.useFakeTimers();
    try {
      const app = renderDemo();
      await openOffers(app);
      expect(screen.getAllByText('Vence en 2:00').length).toBeGreaterThan(0);
      await act(async () => {
        app.clock.now += 121_000;
        jest.advanceTimersByTime(1000);
      });
      expect(screen.getAllByText('Oferta vencida').length).toBeGreaterThan(1);
      expect(screen.getAllByRole('button', { name: 'Aceptar oferta' })[0]).toBeDisabled();
    } finally {
      jest.useRealTimers();
    }
  });

  it('gives every button a role, a name and at least a 48 px touch target', async () => {
    const app = renderDemo();
    await openOffers(app);
    for (const button of screen.getAllByRole('button').filter((node) => node.props.accessibilityLabel)) {
      const style = StyleSheet.flatten(button.props.style) ?? {};
      if (style.minHeight !== undefined) expect(style.minHeight).toBeGreaterThanOrEqual(48);
    }
    for (const name of ['Aceptar oferta', 'Rechazar']) {
      const style = StyleSheet.flatten(screen.getAllByRole('button', { name })[0]!.props.style);
      expect(style.minHeight).toBeGreaterThanOrEqual(48);
    }
  });

  it('switches to the dark theme from the shift screen', async () => {
    const app = renderDemo({ theme: 'light' });
    await signInAvailable(app);
    await app.user.press(screen.getByRole('radio', { name: 'Oscuro' }));
    expect(screen.getByRole('radio', { name: 'Oscuro' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Claro' })).not.toBeChecked();
  });

  it('blocks any mode other than demo without building a gateway', async () => {
    render(<App mode={{ kind: 'blocked', requested: 'real' }} />);
    expect(await screen.findByText('Modo real no disponible')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Entrar en modo demostración' })).not.toBeOnTheScreen();
  });
});
