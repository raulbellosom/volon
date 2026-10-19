import { createEvaluationHttp, type EvaluationHttpOptions } from './http.ts';
import { parseRoute, parseSearch } from './provider-responses.ts';
import { EvaluationFailure, validateOperation, type EvaluationAdapter, type Operation, type Provider } from './types.ts';

/** Evaluation only. HTTP is injected, fixed hosts cannot be replaced by user configuration. */
export function createProviderAdapter(provider: Provider, key: string, options: EvaluationHttpOptions): EvaluationAdapter {
  if (!['geoapify', 'google', 'mapbox'].includes(provider) || !key.trim() || /[\r\n]/.test(key)) {
    throw new Error('Invalid evaluation provider configuration');
  }
  const http = createEvaluationHttp(options);
  return { provider, execute: async (operation) => {
    validateOperation(operation);
    if (provider === 'mapbox' && operation.kind === 'route' && operation.mode === 'motorcycle') {
      return { result: { kind: 'unsupported' }, attempts: 0 };
    }
    const { url, init } = buildRequest(provider, key, operation);
    const { body, attempts } = await http(url, init);
    try {
      const result = operation.kind === 'route' ? parseRoute(provider, body)
        : parseSearch(provider, body, operation.kind === 'autocomplete');
      return { result, attempts };
    } catch (error) {
      throw new EvaluationFailure(error instanceof EvaluationFailure ? error.code : 'invalid_response', attempts);
    }
  } };
}

function buildRequest(provider: Provider, key: string, operation: Operation): { url: URL; init: RequestInit } {
  if (provider === 'google') {
    if (operation.kind === 'route') {
      return { url: new URL('https://routes.googleapis.com/directions/v2:computeRoutes'), init: {
        method: 'POST', headers: { 'content-type': 'application/json', 'X-Goog-Api-Key': key,
          'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration' },
        body: JSON.stringify({ origin: { location: { latLng: { latitude: operation.origin.lat, longitude: operation.origin.lng } } },
          destination: { location: { latLng: { latitude: operation.destination.lat, longitude: operation.destination.lng } } },
          travelMode: operation.mode === 'motorcycle' ? 'TWO_WHEELER' : 'DRIVE', routingPreference: 'TRAFFIC_UNAWARE' }),
      } };
    }
    if (operation.kind === 'autocomplete') {
      return { url: new URL('https://places.googleapis.com/v1/places:autocomplete'), init: {
        method: 'POST', headers: { 'content-type': 'application/json', 'X-Goog-Api-Key': key },
        body: JSON.stringify({ input: operation.query, includedRegionCodes: ['mx'], languageCode: 'es' }),
      } };
    }
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.search = new URLSearchParams({ key, address: operation.query, components: 'country:MX', language: 'es' }).toString();
    return { url, init: {} };
  }
  if (provider === 'geoapify') {
    const url = new URL(operation.kind === 'route' ? 'https://api.geoapify.com/v1/routing'
      : `https://api.geoapify.com/v1/geocode/${operation.kind === 'autocomplete' ? 'autocomplete' : 'search'}`);
    url.searchParams.set('apiKey', key);
    if (operation.kind === 'route') {
      url.searchParams.set('waypoints', `${operation.origin.lat},${operation.origin.lng}|${operation.destination.lat},${operation.destination.lng}`);
      url.searchParams.set('mode', operation.mode === 'motorcycle' ? 'motorcycle' : 'drive');
      url.searchParams.set('format', 'geojson');
    } else {
      url.searchParams.set('text', operation.query);
      url.searchParams.set('filter', 'countrycode:mx');
      url.searchParams.set('lang', 'es');
      url.searchParams.set('format', 'json');
      url.searchParams.set('limit', '5');
    }
    return { url, init: {} };
  }
  if (operation.kind === 'route') {
    const url = new URL(`https://api.mapbox.com/directions/v5/mapbox/driving/${operation.origin.lng},${operation.origin.lat};${operation.destination.lng},${operation.destination.lat}`);
    url.search = new URLSearchParams({ access_token: key, overview: 'false', steps: 'false' }).toString();
    return { url, init: {} };
  }
  const url = new URL('https://api.mapbox.com/search/geocode/v6/forward');
  url.search = new URLSearchParams({ access_token: key, q: operation.query, country: 'mx', language: 'es', limit: '5',
    autocomplete: String(operation.kind === 'autocomplete'), permanent: 'false' }).toString();
  return { url, init: {} };
}
