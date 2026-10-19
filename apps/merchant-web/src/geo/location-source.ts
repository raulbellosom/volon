import type { QuotePoint } from '@delivery/contracts';

/**
 * Where the drop-off coordinates come from. Pickup always comes from the server
 * (`GET /v1/branches/{id}/pickup-location`); only the destination still needs a source.
 *
 * There is no geocoding yet, so the only implementation is a development one: a fixed synthetic
 * point about 1.5 km from the synthetic branches. The typed address is never turned into
 * coordinates. It is never available in a production build.
 */
export interface LocationSource {
  readonly kind: 'synthetic';
  dropoff(): QuotePoint;
}

const syntheticSource: LocationSource = {
  kind: 'synthetic',
  dropoff: () => ({ lat: 0.01, lng: 0.01 }),
};

/** `null` means quoting is blocked until a geocoding provider is approved. */
export function locationSource(isDevelopment: boolean = import.meta.env.DEV): LocationSource | null {
  return isDevelopment ? syntheticSource : null;
}
