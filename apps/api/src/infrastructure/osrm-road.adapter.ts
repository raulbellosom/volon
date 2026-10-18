import type { QuotePoint } from '@delivery/contracts';

/** Isolated candidate adapter: never activated by the API's composition root. */
export interface RoadRoute {
  readonly source: 'road-network';
  readonly provider: 'osrm';
  readonly distanceMeters: number;
  /** Routing-model estimate, NOT a delivery ETA or customer promise. */
  readonly estimatedDurationSeconds: number;
}

export class RoadRoutingError extends Error {
  constructor(readonly reason: 'NO_ROUTE' | 'UNAVAILABLE') {
    super(reason);
  }
}

export interface OsrmRoadOptions {
  /** Server-side trusted URL; HTTPS or local loopback HTTP only. */
  readonly baseUrl: string;
  readonly fetcher?: typeof fetch;
  readonly timeoutMilliseconds?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validatePoint(point: QuotePoint): void {
  if (!Number.isFinite(point.lat) || Math.abs(point.lat) > 90
    || !Number.isFinite(point.lng) || Math.abs(point.lng) > 180) {
    throw new RangeError('Invalid route point');
  }
}

function parseRoadRoute(value: unknown): RoadRoute {
  if (!isRecord(value)) throw new RoadRoutingError('UNAVAILABLE');
  if (value.code === 'NoRoute') throw new RoadRoutingError('NO_ROUTE');
  if (value.code !== 'Ok' || !Array.isArray(value.routes) || !isRecord(value.routes[0])) {
    throw new RoadRoutingError('UNAVAILABLE');
  }
  const route = value.routes[0];
  if (typeof route.distance !== 'number' || typeof route.duration !== 'number'
    || !Number.isFinite(route.distance) || !Number.isFinite(route.duration)
    || route.distance < 0 || route.duration < 0
    || !Number.isSafeInteger(Math.ceil(route.distance))
    || !Number.isSafeInteger(Math.ceil(route.duration))) {
    throw new RoadRoutingError('UNAVAILABLE');
  }
  return Object.freeze({
    source: 'road-network', provider: 'osrm',
    distanceMeters: Math.ceil(route.distance),
    estimatedDurationSeconds: Math.ceil(route.duration),
  });
}

export function createOsrmRoadRouter(options: OsrmRoadOptions) {
  const base = new URL(options.baseUrl);
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname);
  if (!(base.protocol === 'https:' || (base.protocol === 'http:' && loopback))
    || base.username || base.password || base.search || base.hash || base.pathname !== '/') {
    throw new RangeError('Invalid trusted routing endpoint');
  }
  const timeout = options.timeoutMilliseconds ?? 3000;
  if (!Number.isSafeInteger(timeout) || timeout < 1 || timeout > 30000) {
    throw new RangeError('Invalid routing timeout');
  }
  const fetcher = options.fetcher ?? fetch;
  return async (pickup: QuotePoint, dropoff: QuotePoint): Promise<RoadRoute> => {
    validatePoint(pickup);
    validatePoint(dropoff);
    const url = new URL(
      `/route/v1/driving/${pickup.lng},${pickup.lat};${dropoff.lng},${dropoff.lat}`, base,
    );
    url.searchParams.set('overview', 'false');
    url.searchParams.set('steps', 'false');
    try {
      const response = await fetcher(url, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(timeout),
      });
      if (!response.ok) throw new RoadRoutingError('UNAVAILABLE');
      const result: unknown = await response.json();
      return parseRoadRoute(result);
    } catch (error) {
      if (error instanceof RoadRoutingError) throw error;
      throw new RoadRoutingError('UNAVAILABLE');
    }
  };
}
