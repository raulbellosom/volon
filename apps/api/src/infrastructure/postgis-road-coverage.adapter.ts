import type { PrismaClient } from '@prisma/client';
import type { DeliveryQuoteRequest, QuotePoint } from '@delivery/contracts';
import { withSubject } from './database.ts';
import { QuoteFailure, type QuoteActor } from '../modules/pricing/quote.service.ts';
import type { RoadCoverageInspection } from '../modules/routing/road-eligibility.service.ts';

function isCoordinate(point: QuotePoint): boolean {
  return Number.isFinite(point.lat) && Math.abs(point.lat) <= 90
    && Number.isFinite(point.lng) && Math.abs(point.lng) <= 180;
}

/** Server-owned polygon, never supplied by a public API request. */
function polygonGeoJson(vertices: readonly QuotePoint[]): string {
  if (!Array.isArray(vertices) || vertices.length < 3 || vertices.length > 128
    || !vertices.every(isCoordinate)) {
    throw new RangeError('Invalid coverage polygon vertices');
  }
  const ring = vertices.map((point) => [point.lng, point.lat]);
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (!first || !last) throw new RangeError('Invalid coverage polygon');
  if (first[0] !== last[0] || first[1] !== last[1]) ring.push([...first]);
  if (ring.length < 4) throw new RangeError('Invalid polygon ring');
  return JSON.stringify({ type: 'Polygon', coordinates: [ring] });
}

/**
 * PostGIS geometry and tenant RLS; isolated from the existing quoting handler.
 * A pilot zone must be approved separately before enabling road eligibility.
 */
export function createPostgisCoverageInspector(db: PrismaClient, vertices: readonly QuotePoint[]) {
  const geoJson = polygonGeoJson(vertices);
  return (request: DeliveryQuoteRequest, actor: QuoteActor): Promise<RoadCoverageInspection> =>
    withSubject(db, actor, async (tx) => {
      const branch = await tx.branch.findUnique({ where: { id: request.branchId } });
      if (!branch || !branch.enabled) throw new QuoteFailure('ACCESS_DENIED');
      const [area] = await tx.$queryRaw<{
        regionValid: boolean;
        pickupMatches: boolean;
        pickupCovered: boolean;
        dropoffCovered: boolean;
      }[]>`
        WITH region AS (
          SELECT extensions.ST_SetSRID(extensions.ST_GeomFromGeoJSON(${geoJson}), 4326) AS shape
        )
        SELECT
          extensions.ST_IsValid(shape) AND extensions.ST_Area(shape) > 0 AS "regionValid",
          extensions.ST_DWithin(
            extensions.ST_SetSRID(extensions.ST_MakePoint(
              ${branch.longitude}, ${branch.latitude}
            ), 4326)::extensions.geography,
            extensions.ST_SetSRID(extensions.ST_MakePoint(
              ${request.pickup.lng}, ${request.pickup.lat}
            ), 4326)::extensions.geography, 1
          ) AS "pickupMatches",
          extensions.ST_Covers(shape, extensions.ST_SetSRID(extensions.ST_MakePoint(
            ${branch.longitude}, ${branch.latitude}
          ), 4326)) AS "pickupCovered",
          extensions.ST_Covers(shape, extensions.ST_SetSRID(extensions.ST_MakePoint(
            ${request.dropoff.lng}, ${request.dropoff.lat}
          ), 4326)) AS "dropoffCovered"
        FROM region`;
      if (!area?.regionValid) throw new QuoteFailure('ROUTING_UNAVAILABLE');
      return {
        trustedPickup: Object.freeze({ lat: branch.latitude, lng: branch.longitude }),
        pickupMatches: area.pickupMatches,
        pickupCovered: area.pickupCovered,
        dropoffCovered: area.dropoffCovered,
      };
    });
}
