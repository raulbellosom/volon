import { createContext, use, type ReactNode } from 'react';
import type { DemoControls } from '../adapters/synthetic/synthetic-gateway.ts';

const DemoControlsContext = createContext<DemoControls | null>(null);

/** Exposes the synthetic adapter's knobs to the demo controls screen only. */
export function DemoControlsProvider({ controls, children }: { controls: DemoControls; children: ReactNode }) {
  return <DemoControlsContext value={controls}>{children}</DemoControlsContext>;
}

export function useDemoControls(): DemoControls {
  const value = use(DemoControlsContext);
  if (!value) throw new Error('useDemoControls must be used inside <DemoControlsProvider>.');
  return value;
}
