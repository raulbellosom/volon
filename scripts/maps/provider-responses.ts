import { EvaluationFailure, isRecord, validPoint, type Candidate, type EvaluationResult, type Provider } from './types.ts';

function invalid(): never { throw new EvaluationFailure('invalid_response'); }
function rows(value: unknown): unknown[] { return Array.isArray(value) ? value : invalid(); }
function record(value: unknown): Record<string, unknown> { return isRecord(value) ? value : invalid(); }
function googleError(body: Record<string, unknown>): void {
  if (!Object.hasOwn(body, 'error')) return;
  const error = record(body.error);
  throw new EvaluationFailure(error.code === 429 || error.status === 'RESOURCE_EXHAUSTED' ? 'quota'
    : error.code === 401 || error.code === 403 || error.status === 'PERMISSION_DENIED' ? 'auth' : 'invalid_response');
}
function point(lat: unknown, lng: unknown) {
  const value = { lat, lng };
  return validPoint(value) ? Object.freeze(value) : invalid();
}
function houseNumber(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 && value.length <= 24 ? value.trim().toUpperCase() : null;
}
function level(value: unknown): Candidate['granularity'] {
  if (['address', 'building', 'premise', 'street_address', 'subpremise'].includes(String(value))) return 'address';
  if (['street', 'route'].includes(String(value))) return 'street';
  if (['city', 'place', 'neighbourhood', 'neighborhood', 'locality', 'postcode'].includes(String(value))) return 'area';
  return 'unknown';
}
export function parseSearch(provider: Provider, value: unknown, autocomplete: boolean): EvaluationResult {
  const body = record(value);
  let candidates: Candidate[];
  if (provider === 'google') {
    googleError(body);
    if (autocomplete) {
      candidates = rows(body.suggestions ?? []).map((row) => {
        const prediction = record(record(row).placePrediction);
        // Places predictions have no coordinate; never silently bill Place Details.
        return { point: null, granularity: level(rows(prediction.types ?? [])[0]), houseNumber: null };
      });
    } else {
      if (body.status === 'ZERO_RESULTS') return { kind: 'search', candidates: [] };
      if (body.status !== 'OK') {
        throw new EvaluationFailure(body.status === 'OVER_QUERY_LIMIT' ? 'quota'
          : body.status === 'REQUEST_DENIED' ? 'auth' : 'invalid_response');
      }
      candidates = rows(body.results).map((row) => {
        const item = record(row);
        const location = record(record(item.geometry).location);
        const components = rows(item.address_components ?? []);
        const number = components.find((component) => isRecord(component)
          && Array.isArray(component.types) && component.types.includes('street_number'));
        return { point: point(location.lat, location.lng), granularity: level(rows(item.types)[0]),
          houseNumber: houseNumber(isRecord(number) ? number.long_name : undefined) };
      });
    }
  } else if (provider === 'geoapify') {
    candidates = rows(body.results).map((row) => {
      const item = record(row);
      return { point: point(item.lat, item.lon), granularity: level(item.result_type), houseNumber: houseNumber(item.housenumber) };
    });
  } else {
    candidates = rows(body.features).map((row) => {
      const item = record(row);
      const coordinates = rows(record(item.geometry).coordinates);
      const properties = record(item.properties);
      const context = isRecord(properties.context) ? properties.context : {};
      const address = isRecord(context.address) ? context.address : {};
      return { point: point(coordinates[1], coordinates[0]), granularity: level(properties.feature_type),
        houseNumber: houseNumber(address.address_number) };
    });
  }
  if (candidates.length > 20) invalid();
  return { kind: 'search', candidates: Object.freeze(candidates.map((candidate) => Object.freeze(candidate))) };
}

export function parseRoute(provider: Provider, value: unknown): EvaluationResult {
  const body = record(value);
  if (provider === 'google') googleError(body);
  let distance: unknown;
  let duration: unknown;
  if (provider === 'geoapify') {
    const features = rows(body.features);
    if (!features.length) return { kind: 'empty' };
    const properties = record(record(features[0]).properties);
    distance = properties.distance;
    duration = properties.time;
  } else {
    if (provider === 'mapbox' && body.code !== 'Ok') {
      if (body.code === 'NoRoute') return { kind: 'empty' };
      invalid();
    }
    const routes = rows(body.routes ?? (provider === 'google' ? [] : undefined));
    if (!routes.length) return { kind: 'empty' };
    const route = record(routes[0]);
    distance = provider === 'google' ? route.distanceMeters : route.distance;
    duration = provider === 'google' && typeof route.duration === 'string' && /^\d+(\.\d+)?s$/.test(route.duration)
      ? Number(route.duration.slice(0, -1)) : route.duration;
  }
  if (typeof distance !== 'number' || typeof duration !== 'number' || !Number.isFinite(distance)
    || !Number.isFinite(duration) || distance < 0 || duration < 0
    || distance > Number.MAX_SAFE_INTEGER || duration > Number.MAX_SAFE_INTEGER) invalid();
  return { kind: 'route', distanceMeters: distance, durationSeconds: duration };
}
