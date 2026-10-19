import { screen, within } from '@testing-library/react-native';
import { renderDemo, signInAvailable } from '../test/render-app.tsx';

describe('courier demo flow', () => {
  it('starts at the demo sign-in, clearly marked as fictitious', async () => {
    renderDemo();
    expect(await screen.findByRole('header', { name: 'App de repartidores' })).toBeOnTheScreen();
    expect(screen.getByText('Modo demostración · datos ficticios, sin despacho real')).toBeOnTheScreen();
    expect(screen.getByText('Entrarás como «Repartidor de prueba»')).toBeOnTheScreen();
  });

  it('goes from shift to offers, accepts one and walks every simulated step', async () => {
    const app = renderDemo();
    await signInAvailable(app);
    expect(screen.getByText('Disponible (simulado)')).toBeOnTheScreen();

    await app.user.press(screen.getByRole('button', { name: 'Ver ofertas' }));
    const offer = await screen.findByRole('button', { name: /Oferta DEMO-1042/ });
    expect(offer).toBeOnTheScreen();
    expect(screen.getAllByText('Vence en 2:00').length).toBeGreaterThan(0);

    await app.user.press(screen.getAllByRole('button', { name: 'Aceptar oferta' })[0]!);
    expect(await screen.findByRole('header', { name: 'Oferta aceptada' })).toBeOnTheScreen();
    expect(screen.getByText('Simulación local')).toBeOnTheScreen();

    for (const action of ['Voy a recoger', 'Llegué al comercio', 'Recogí el paquete', 'Voy al destino', 'Entregué el paquete']) {
      await app.user.press(await screen.findByRole('button', { name: action }));
    }
    expect(await screen.findByText('Entrega completada (simulada)')).toBeOnTheScreen();
    expect(screen.getByLabelText('Entrega completada, completada')).toBeOnTheScreen();

    await app.user.press(screen.getByRole('button', { name: 'Volver a mi turno' }));
    expect(await screen.findByText('Listo para recibir ofertas')).toBeOnTheScreen();
  });

  it('opens the offer detail with fictitious addresses and no route or ETA', async () => {
    const app = renderDemo();
    await signInAvailable(app);
    await app.user.press(screen.getByRole('button', { name: 'Ver ofertas' }));
    await app.user.press(await screen.findByRole('button', { name: /Oferta DEMO-1042/ }));
    expect(await screen.findByText('Sin ruta ni tiempo estimado')).toBeOnTheScreen();
    expect(screen.getByLabelText(/Entregar en\. Colonia Ficticia Norte\. Calle Inventada 45.*Indicaciones: Portón azul de prueba/)).toBeOnTheScreen();
  });

  it('declines an offer and removes it from the inbox', async () => {
    const app = renderDemo();
    await signInAvailable(app);
    await app.user.press(screen.getByRole('button', { name: 'Ver ofertas' }));
    await screen.findByRole('button', { name: /Oferta DEMO-1042/ });
    await app.user.press(screen.getAllByRole('button', { name: 'Rechazar' })[0]!);
    expect(screen.queryByRole('button', { name: /Oferta DEMO-1042/ })).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: /Oferta DEMO-1043/ })).toBeOnTheScreen();
  });

  it('shows a conflict when another (simulated) courier takes the offer first', async () => {
    const app = renderDemo();
    await signInAvailable(app);
    await app.user.press(screen.getByRole('button', { name: 'Ver ofertas' }));
    await app.user.press(await screen.findByRole('button', { name: /Oferta DEMO-1043/ }));
    await app.user.press(await screen.findByRole('button', { name: 'Aceptar oferta' }));
    expect(await screen.findByText('Ya no está disponible')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Aceptar oferta' })).toBeDisabled();
  });

  it('marks an offer the server already expired and blocks both answers', async () => {
    const app = renderDemo();
    await signInAvailable(app);
    await app.user.press(screen.getByRole('button', { name: 'Ver ofertas' }));
    await app.user.press(await screen.findByRole('button', { name: /Oferta DEMO-1044/ }));
    expect(await screen.findByText('Oferta vencida')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Aceptar oferta' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Rechazar' })).toBeDisabled();
  });

  it('lists what the demo deliberately does not do', async () => {
    const app = renderDemo();
    await app.user.press(await screen.findByRole('button', { name: 'Entrar en modo demostración' }));
    await app.user.press(await screen.findByRole('button', { name: 'Funciones no disponibles' }));
    for (const feature of ['Ubicación y GPS', 'Mapas y navegación', 'Cámara y evidencia de entrega', 'Notificaciones', 'Pagos y ganancias', 'Despacho real']) {
      expect(await screen.findByLabelText(new RegExp(`^${feature}: no disponible`))).toBeOnTheScreen();
    }
  });

  it('asks to finish the delivery in progress before showing new offers', async () => {
    const app = renderDemo();
    await signInAvailable(app);
    await app.user.press(screen.getByRole('button', { name: 'Ver ofertas' }));
    await app.user.press((await screen.findAllByRole('button', { name: 'Aceptar oferta' }))[0]!);
    await screen.findByRole('header', { name: 'Oferta aceptada' });
    expect(within(screen.getByLabelText('Etapas de la entrega')).getByLabelText('Oferta aceptada, actual')).toBeOnTheScreen();

    // The shift and inbox screens stay mounted under the delivery (hidden): both reflect the busy shift.
    expect(screen.getByText('Tienes una entrega', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByText('Termina tu entrega en curso', { includeHiddenElements: true })).toBeTruthy();
  });
});
