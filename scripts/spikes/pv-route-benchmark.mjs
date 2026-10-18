/**
 * One-off, noncommercial probe of the OSRM public demo using synthetic public-area coordinates.
 * Not used for product quotes; do not run automatically on every push or for customer requests.
 */
import { setTimeout as sleep } from 'node:timers/promises';

const samples = [
  { id: 'sample-north-central', pickup: { lat: 20.642, lng: -105.226 },
    dropoff: { lat: 20.624, lng: -105.230 } },
  { id: 'sample-central-south', pickup: { lat: 20.624, lng: -105.230 },
    dropoff: { lat: 20.609, lng: -105.234 } },
];

function haversineMeters(a, b) {
  const radians = (degrees) => degrees * Math.PI / 180;
  const lat1 = radians(a.lat);
  const lat2 = radians(b.lat);
  const dLat = lat2 - lat1;
  const dLng = radians(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Math.round(6371000 * 2 * Math.asin(Math.min(1, Math.sqrt(h))));
}

async function probe(sample) {
  const { pickup, dropoff } = sample;
  const coordinates = `${pickup.lng},${pickup.lat};${dropoff.lng},${dropoff.lat}`;
  const url = new URL(`https://router.project-osrm.org/route/v1/driving/${coordinates}`);
  url.searchParams.set('overview', 'false');
  url.searchParams.set('steps', 'false');
  const res = await fetch(url, {
    headers: { Accept: 'application/json',
      'User-Agent': 'Volon-routing-spike/0.1 (https://github.com/raulbellosom/volon; noncommercial test)' },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`);
  const payload = await res.json();
  const route = payload.routes?.[0];
  if (payload.code !== 'Ok' || !route
    || !Number.isFinite(route.distance) || route.distance < 0
    || !Number.isFinite(route.duration) || route.duration < 0) {
    throw new Error(`OSRM route unavailable: ${String(payload.code).slice(0, 40)}`);
  }
  const snapDistancesMeters = (payload.waypoints ?? []).map((point) => Math.round(point.distance));
  return {
    sample: sample.id, source: 'OSRM public demo / car profile',
    lineDistanceMeters: haversineMeters(pickup, dropoff),
    routeDistanceMeters: Math.round(route.distance),
    modelDurationSeconds: Math.round(route.duration),
    snapDistancesMeters,
  };
}

let failures = 0;
for (const [index, sample] of samples.entries()) {
  if (index !== 0) await sleep(1500); // demo server limit: <= 1 req/s
  try {
    console.log(JSON.stringify({ status: 'ok', ...await probe(sample) }));
  } catch (error) {
    failures++;
    // Never include response body, cookies, addresses or backend secrets in public CI logs.
    console.error(JSON.stringify({ status: 'error', sample: sample.id,
      message: error instanceof Error ? error.message.slice(0, 120) : 'unavailable' }));
  }
}
console.log(`Synthetic live routing probe: ${samples.length - failures}/${samples.length} successful.`);
if (failures) process.exitCode = 1;
