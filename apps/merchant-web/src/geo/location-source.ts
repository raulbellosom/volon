import type { QuotePoint } from '@delivery/contracts';

export interface QuoteRoutePoints {
  readonly pickup: QuotePoint;
  readonly dropoff: QuotePoint;
}

/**
 * Turns the chosen branch and the typed address into quote coordinates.
 *
 * There is no geocoding service and `/v1/me` does not expose branch locations yet, so the only
 * implementation is a development one: the synthetic local branches sit at (0, 0) and the drop-off
 * is a fixed point about 1.5 km away. It is never available in a production build.
 */
export interface LocationSource {
  readonly kind: 'synthetic';
  resolve(branchId: string, address: string): QuoteRoutePoints;
}

const syntheticSource: LocationSource = {
  kind: 'synthetic',
  resolve: () => ({ pickup: { lat: 0, lng: 0 }, dropoff: { lat: 0.01, lng: 0.01 } }),
};

/** `null` means quoting is blocked until geocoding and branch locations exist. */
export function locationSource(isDevelopment: boolean = import.meta.env.DEV): LocationSource | null {
  return isDevelopment ? syntheticSource : null;
}
