import { estimateCost, type CostScenario } from './cost.ts';

/** Monthly SKU allowances are shared by the billing account, assumed unused here. */
function tiered(count: number, free: number, first: number, second: number, boundary = 100000): number {
  return Math.max(0, Math.min(count, boundary) - free) * first / 1000
    + Math.max(0, count - boundary) * second / 1000;
}

export const MONTHLY_VOLUMES = [100, 500, 1000, 3000, 10000] as const;
const plans = [
  { name: 'Free', daily: 3000, usd: 0, rps: 5 },
  { name: 'API10', daily: 10000, usd: 59, rps: 12 },
  { name: 'API25', daily: 25000, usd: 109, rps: 15 },
  { name: 'API50', daily: 50000, usd: 179, rps: 20 },
  { name: 'API100', daily: 100000, usd: 299, rps: 25 },
  { name: 'API250', daily: 250000, usd: 609, rps: 30 },
] as const;

/** Same session assumptions as cost.ts, now with monthly tiers and daily peaks. No network. */
export function estimateMonthlyCost(scenario: CostScenario) {
  const sensitivity = estimateCost('geoapify', scenario); // Reuse validation and credit formula.
  if (sensitivity.creditsPerDelivery === undefined || sensitivity.peakDailyCredits === undefined) {
    throw new Error('Missing credit estimate');
  }
  const { creditsPerDelivery, peakDailyCredits } = sensitivity;
  const n = scenario.monthlyDeliveries;
  // Prices modeled only through the published second tier; refuse extrapolation.
  const usage = {
    autocomplete: scenario.autocomplete * n, geocoding: (scenario.geocode + scenario.reverse) * n,
    details: scenario.details * n, routes: scenario.routes * n, maps: scenario.mapLoads * n,
  };
  if (Object.values(usage).some((count) => count > 500000)) throw new Error('Cost range requires review');
  const google = {
    autocomplete: tiered(usage.autocomplete, 10000, 2.83, 2.27),
    geocoding: tiered(usage.geocoding, 10000, 5, 4),
    details: tiered(usage.details, 10000, 5, 4),
    routes: scenario.mode === 'motorcycle' ? tiered(usage.routes, 1000, 15, 12)
      : tiered(usage.routes, 10000, 5, 4),
    maps: tiered(usage.maps, 10000, 7, 5.6),
  };
  const mapbox = {
    temporaryAutocomplete: tiered(usage.autocomplete, 100000, 0.75, 0.6, 500000),
    permanentGeocoding: usage.geocoding * 5 / 1000,
    routesDrivingOnly: tiered(usage.routes, 100000, 2, 1.6, 500000),
    maps: tiered(usage.maps, 50000, 5, 4),
  };
  if (usage.maps > 200000) throw new Error('Map load tier requires review');
  const plan = plans.find((item) => peakDailyCredits <= item.daily) ?? null;
  const total = (components: Record<string, number>) => Math.round(Object.values(components)
    .reduce((sum, value) => sum + value, 0) * 100) / 100;
  return { monthlyDeliveries: n, peakDailyDeliveries: scenario.peakDailyDeliveries, usage,
    geoapify: { creditsPerDelivery,
      monthlyCredits: creditsPerDelivery * n, peakDailyCredits,
      plan, monthlyUsd: plan?.usd ?? null, marginalCreditUsd: null },
    google: { components: google, monthlyUsd: total(google), routeSku: scenario.mode === 'motorcycle'
      ? 'Compute Routes Enterprise' : 'Compute Routes Essentials' },
    mapbox: { components: mapbox, monthlyUsd: scenario.mode === 'motorcycle' ? null : total(mapbox),
      drivingComparisonUsd: total(mapbox), motorcycleSupported: false },
    assumptions: 'USD sin impuestos/FX; franquicias completas disponibles; sin compromiso ni descuentos; tiles incluidos en map loads Google/Mapbox; Geoapify por tiles; rutas <500 km; cuenta/licencia pendientes.' };
}
