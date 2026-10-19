import { createHash } from 'node:crypto';
import { COST_SCENARIOS } from './cost.ts';
import { estimateMonthlyCost, MONTHLY_VOLUMES } from './monthly-cost.ts';
import { isRecord, validPoint, validateOperation } from './types.ts';

interface PublicPoi {
  readonly id: string;
  readonly name: string;
  readonly zone: string;
  readonly coordinateSource: string;
  readonly coordinateRole: string;
  readonly coordinateLicense: string;
  readonly limitations: string;
}
interface ProposedQuery {
  readonly id: string;
  readonly kind: 'geocode' | 'autocomplete';
  readonly query: string;
  readonly category: string;
  readonly mapboxCapability: string;
}
function invalid(): never { throw new Error('Invalid public preflight proposal'); }
function label(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || value.length > 300 || /[\p{Cc}\p{Cs}]/u.test(value)) invalid();
  return value;
}
function id(value: unknown): string {
  const result = label(value);
  if (!/^[a-z0-9_-]{1,64}$/.test(result)) invalid();
  return result;
}
function source(value: unknown): string {
  const result = label(value);
  const url = new URL(result);
  // Public references only: never echo arbitrary token-bearing URLs.
  if (url.protocol !== 'https:' || url.username || url.password || url.hash
    || !['www.wikidata.org', 'sic.cultura.gob.mx'].includes(url.hostname)) invalid();
  const allowed = url.hostname === 'www.wikidata.org' ? ['title', 'oldid'] : ['table', 'table_id'];
  if ([...url.searchParams.keys()].some((key) => !allowed.includes(key))) invalid();
  return result;
}

/** Pure proposal inspection. No env, transport, approvals, or executable manifest is produced. */
export function createPreflight(bytes: string): string {
  if (Buffer.byteLength(bytes) > 1048576) invalid();
  const data: unknown = JSON.parse(bytes);
  if (!isRecord(data) || data.schemaVersion !== 1 || data.status !== 'proposal-only-not-approved'
    || data.accessPointsReviewed !== false || !Array.isArray(data.pois) || !data.pois.length || data.pois.length > 30
    || !Array.isArray(data.queryProposals) || !data.queryProposals.length || data.queryProposals.length > 100
    || !Array.isArray(data.routeProposals) || data.routeProposals.length > 100) invalid();
  const poiIds = new Set<string>();
  const pois: PublicPoi[] = data.pois.map((value: unknown) => {
    if (!isRecord(value) || !validPoint(value.referencePoint) || value.accessToleranceMeters !== null
      || value.accuracyMeters !== null || value.vehicleAccessReviewed !== false) invalid();
    const poiId = id(value.id);
    if (poiIds.has(poiId)) invalid();
    poiIds.add(poiId);
    return { id: poiId, name: label(value.name), zone: label(value.zone),
      coordinateSource: source(value.coordinateSource), coordinateRole: label(value.coordinateRole),
      coordinateLicense: label(value.coordinateLicense), limitations: label(value.limitations) };
  });
  const queryIds = new Set<string>();
  const queries: ProposedQuery[] = data.queryProposals.map((value: unknown) => {
    if (!isRecord(value) || (value.kind !== 'geocode' && value.kind !== 'autocomplete')
      || (value.poi !== null && !poiIds.has(String(value.poi))) || value.expectEmpty !== null) invalid();
    const queryId = id(value.id);
    if (queryIds.has(queryId)) invalid();
    queryIds.add(queryId);
    const operation: Pick<ProposedQuery, 'kind' | 'query'> = { kind: value.kind, query: label(value.query) };
    validateOperation(operation);
    if (!['unsupported-poi-name', 'address-or-area-search'].includes(String(value.mapboxCapability))) invalid();
    return { id: queryId, ...operation, category: label(value.category), mapboxCapability: String(value.mapboxCapability) };
  });
  const routes = data.routeProposals.map((value: unknown) => {
    if (!isRecord(value) || !poiIds.has(String(value.from)) || !poiIds.has(String(value.to))
      || typeof value.status !== 'string' || !value.status.startsWith('review-')
      || !Array.isArray(value.reviewNeeds) || !value.reviewNeeds.length) invalid();
    return `${id(value.from)} → ${id(value.to)}: ${label(value.status)}; ${value.reviewNeeds.map(label).join(', ')}`;
  });
  const autocomplete = queries.filter((query) => query.kind === 'autocomplete').length;
  const geocode = queries.length - autocomplete;
  const mapbox = queries.filter((query) => query.mapboxCapability !== 'unsupported-poi-name').length;
  const lines = [
    'PREFLIGHT — SOLO PROPUESTA; ejecución real BLOQUEADA; llamadas a proveedores realizadas: 0',
    `SHA-256 del manifiesto público (bytes UTF-8): ${createHash('sha256').update(bytes).digest('hex')}`,
    `${pois.length} referencias; ${geocode} geocode; ${autocomplete} autocomplete; ${routes.length} rutas PENDIENTES; 0 rutas autorizables.`,
    'Exactitud: desconocida. Tolerancias: null. Aciertos top-1/top-k: no puntuables; distancia documental solamente.',
    '', 'REFERENCIAS (centroides/estructuras/áreas no prueban entradas de moto)',
    ...pois.map((poi) => `${poi.id}: ${poi.name} [${poi.zone}]\n  ${poi.coordinateRole}; ${poi.coordinateSource}\n  ${poi.coordinateLicense}; ${poi.limitations}`),
    '', 'CONSULTAS EXTERNAS PROPUESTAS (ninguna ejecutada; texto público explícito)',
    ...queries.map((query) => `${query.id} | ${query.kind} | ${query.query} | ${query.category} | Mapbox: ${query.mapboxCapability}`),
    '', 'RUTAS EXCLUIDAS (sin coordenadas de acceso confirmadas)', ...routes,
    '', 'PRESUPUESTO PROPUESTO DEL PRIMER EXPERIMENTO: solo Geoapify',
    `Máximo ${queries.length} intentos HTTP = ${queries.length} créditos estimados; una pasada, cero retries.`,
    '0 rutas, detalles, reverse, mapas o tiles; ninguna llamada implícita posterior.',
    'USD 0 adicionales estimados SOLO con cuota Free disponible; no es un techo de factura garantizado.',
    'Cuota Free 3000 créditos/día, 5 req/s; cuotas blandas. Si no alcanza: detener, no contratar automáticamente.',
    'API10 opcional: USD 59/mes antes de impuestos, exige aprobación separada; no precio marginal por llamada.',
    `Comparación NO autorizada: Google ${queries.length} llamadas, USD ${(geocode * 0.005 + autocomplete * 0.00283).toFixed(5)} brutos sin franquicia; autocomplete sin coordenadas/detalles.`,
    `Mapbox: ${mapbox} llamadas temporales compatibles, USD ${(mapbox * 0.00075).toFixed(5)} brutos sin franquicia; POIs omitidos, moto unsupported.`,
    '', 'LICENCIAS Y CONFIGURACIÓN PENDIENTES',
    'Geoapify: atribución Geoapify (Free) y OSM/fuentes; revisar licencia de agregados y almacenamiento.',
    'Google: términos por producto, restricciones de caché/mapas y advertencia moto beta; no almacenar cuerpos.',
    'Mapbox: Temporary no permite persistencia; Permanent exige habilitación/contrato; sin POI v6 ni moto.',
    'Referencia de aprobación humana + manifiesto real separado + SHA-256 exacto + límite explícito.',
    'Variables requeridas posteriormente: MAP_EVAL_REAL, MAP_EVAL_ADMIN_APPROVED, MAP_EVAL_LICENSE_APPROVED,',
    'MAP_EVAL_PROVIDER, MAP_EVAL_<PROVIDER>_KEY, MAP_EVAL_DATASET_SHA256, MAP_EVAL_MAX_REQUESTS.',
    'No se leen claves ni .env; el preflight no convierte ni aprueba este dataset para --real.',
    '', 'ECONOMÍA MENSUAL ESTIMADA (USD sin impuestos; cuentas sin otro consumo)',
    'Escenario | entregas | pico/día (2 × ceil(N/30), supuesto) | Geoapify plan/USD | Google moto/USD | Mapbox auto hipotético/USD (moto no soportada)',
  ];
  for (const [name, scenario] of Object.entries(COST_SCENARIOS)) {
    for (const n of MONTHLY_VOLUMES) {
      const cost = estimateMonthlyCost({ ...scenario, monthlyDeliveries: n, peakDailyDeliveries: 2 * Math.ceil(n / 30) });
      lines.push(`${name} | ${n} | ${cost.peakDailyDeliveries} | ${cost.geoapify.plan?.name ?? 'revisar'} / ${cost.geoapify.monthlyUsd} | ${cost.google.monthlyUsd.toFixed(2)} | ${cost.mapbox.drivingComparisonUsd.toFixed(2)}`);
    }
  }
  lines.push('Supuestos de sesión: single 6 autocomplete, 1 geocode, 1 reverse, 1 detalle Google, 1 ruta, 1 mapa/50 tiles;',
    'requote 12 autocomplete, 2 geocode, 2 reverse, 2 detalles Google, 3 rutas, 2 mapas/100 tiles.',
    'Google/Mapbox incluyen tiles en map load; Geoapify cobra 0.25 crédito/tile. Sin cargos duplicados de tiles.',
    'Fuentes/precios/atribución y límites: docs/validation/map-provider-benchmark.md y address-provider-evaluation.md.',
    '', 'PENDIENTE HUMANO: lugares y licencia de fuentes; tolerancias; accesos/sentidos; cupo/costo;',
    'licencia de resultados/agregados; cuenta/cuotas/alertas/IP; aprobación por hash. Ningún ganador seleccionado.');
  return lines.join('\n');
}
