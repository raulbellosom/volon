import type { EvaluationCase, Provider } from './types.ts';

/** Artificial provider-shaped payloads. Never recorded from a live service. */
export function syntheticFetch(provider: Provider): typeof fetch {
  return async (input, init) => {
    const url = new URL(String(input));
    const posted = typeof init?.body === 'string' ? JSON.parse(init.body) as Record<string, unknown> : {};
    const query = url.searchParams.get('text') ?? url.searchParams.get('q') ?? url.searchParams.get('address') ?? String(posted.input ?? '');
    if (query.includes('quota')) return Response.json({ artificial: true }, { status: 429 });
    if (query.includes('network')) throw new Error('Artificial network failure');
    if (query.includes('invalid')) return Response.json({ artificial: true });
    const route = url.pathname.includes('routing') || url.pathname.includes('directions');
    if (route) {
      return Response.json(provider === 'google' ? { routes: [{ distanceMeters: 2200, duration: '300s' }] }
        : provider === 'mapbox' ? { code: 'Ok', routes: [{ distance: 2200, duration: 300 }] }
          : { features: [{ properties: { distance: 2200, time: 300 } }] });
    }
    const count = query.includes('empty') ? 0 : query.includes('ambiguous') ? 2 : 1;
    const indices = Array.from({ length: count }, (_value, index) => index);
    if (provider === 'google') {
      if (url.pathname.includes('autocomplete')) return Response.json({ suggestions: indices.map(() => ({
        placePrediction: { types: ['street_address'] } })) });
      return Response.json({ status: count ? 'OK' : 'ZERO_RESULTS', results: indices.map((index) => ({
        geometry: { location: { lat: 0.01 + index * 0.01, lng: 0.01 } }, types: ['street_address'] })) });
    }
    if (provider === 'geoapify') return Response.json({ results: indices.map((index) => ({
      lat: 0.01 + index * 0.01, lon: 0.01, result_type: 'building' })) });
    return Response.json({ features: indices.map((index) => ({ geometry: { coordinates: [0.01, 0.01 + index * 0.01] },
      properties: { feature_type: 'address' } })) });
  };
}

export const SYNTHETIC_CASES: readonly EvaluationCase[] = [
  { id: 'synthetic-address', operation: { kind: 'geocode', query: 'synthetic-address' },
    reference: { point: { lat: 0.01, lng: 0.01 }, toleranceMeters: 10 } },
  { id: 'synthetic-ambiguous', operation: { kind: 'geocode', query: 'synthetic-ambiguous' },
    reference: { point: { lat: 0.02, lng: 0.01 }, toleranceMeters: 10 } },
  { id: 'synthetic-empty', operation: { kind: 'geocode', query: 'synthetic-empty' }, expectEmpty: true },
  { id: 'synthetic-prefix', operation: { kind: 'autocomplete', query: 'synthetic-prefix' },
    reference: { point: { lat: 0.01, lng: 0.01 }, toleranceMeters: 10 } },
  { id: 'synthetic-quota', operation: { kind: 'geocode', query: 'synthetic-quota' } },
  { id: 'synthetic-network', operation: { kind: 'geocode', query: 'synthetic-network' } },
  { id: 'synthetic-invalid', operation: { kind: 'geocode', query: 'synthetic-invalid' } },
  { id: 'synthetic-car', operation: { kind: 'route', origin: { lat: 0, lng: 0 }, destination: { lat: 0.01, lng: 0.01 }, mode: 'driving' } },
  { id: 'synthetic-moto', operation: { kind: 'route', origin: { lat: 0, lng: 0 }, destination: { lat: 0.01, lng: 0.01 }, mode: 'motorcycle' } },
];
