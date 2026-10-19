import type { DemoControls } from '../adapters/synthetic/synthetic-gateway.ts';
import { RootNavigator } from '../navigation/RootNavigator.tsx';
import type { CourierGateway } from '../ports/courier-gateway.ts';
import { CourierProvider } from '../state/CourierProvider.tsx';
import { DemoControlsProvider } from './DemoServices.tsx';

/** Gateway, demo controls and navigation; shared by the app and the screen tests. */
export function DemoShell({ gateway, controls, now }: { gateway: CourierGateway; controls: DemoControls; now?: () => number }) {
  return (
    <DemoControlsProvider controls={controls}>
      <CourierProvider gateway={gateway} {...(now ? { now } : {})}>
        <RootNavigator />
      </CourierProvider>
    </DemoControlsProvider>
  );
}
