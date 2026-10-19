import { render, screen, userEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createSyntheticGateway } from '../adapters/synthetic/synthetic-gateway.ts';
import { DemoShell } from '../app/DemoShell.tsx';
import type { CourierGateway } from '../ports/courier-gateway.ts';
import { ThemeProvider, type ThemePreference } from '../theme/ThemeProvider.tsx';

/** Fixed simulated clock so every run sees the same offers and countdowns. */
export const START = Date.parse('2026-10-18T18:00:00.000Z');

export interface RenderOptions {
  theme?: ThemePreference;
  /** Wrap gateway methods, e.g. to spy on calls. */
  decorate?: (gateway: CourierGateway) => CourierGateway;
}

/** Whole demo app (navigation included) on a deterministic synthetic gateway with no latency. */
export function renderDemo({ theme = 'light', decorate = (gateway) => gateway }: RenderOptions = {}) {
  const clock = { now: START };
  const now = () => clock.now;
  const { gateway, controls } = createSyntheticGateway({ now, latencyMs: 0 });
  const wrapped = decorate(gateway);
  const user = userEvent.setup();
  const view = render(
    <SafeAreaProvider>
      <ThemeProvider initialPreference={theme}>
        <DemoShell gateway={wrapped} controls={controls} now={now} />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
  return { ...view, user, clock, controls, gateway: wrapped };
}

/** Signs in and turns availability on, landing on the shift screen with offers loaded. */
export async function signInAvailable(app: ReturnType<typeof renderDemo>) {
  await app.user.press(await screen.findByRole('button', { name: 'Entrar en modo demostración' }));
  await app.user.press(await screen.findByRole('button', { name: 'Ponerme disponible' }));
  await screen.findByText('Listo para recibir ofertas');
}
