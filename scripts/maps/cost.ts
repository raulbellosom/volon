import type { Provider } from './types.ts';

export interface CostScenario {
  readonly autocomplete: number;
  readonly geocode: number;
  readonly reverse: number;
  readonly details: number;
  readonly routes: number;
  readonly mapLoads: number;
  readonly tiles: number;
  readonly monthlyDeliveries: number;
  readonly peakDailyDeliveries: number;
  readonly mode: 'driving' | 'motorcycle';
}
export const COST_SOURCES = Object.freeze({
  reviewedOn: '2026-10-18', mapbox: 'https://www.mapbox.com/pricing',
  google: 'https://developers.google.com/maps/billing-and-pricing/pricing',
  geoapify: 'https://www.geoapify.com/pricing-details/',
});
export const COST_SCENARIOS: Readonly<Record<string, CostScenario>> = Object.freeze({
  single: { autocomplete: 6, geocode: 1, reverse: 1, details: 1, routes: 1, mapLoads: 1, tiles: 50,
    monthlyDeliveries: 3000, peakDailyDeliveries: 100, mode: 'motorcycle' },
  requote: { autocomplete: 12, geocode: 2, reverse: 2, details: 2, routes: 3, mapLoads: 2, tiles: 100,
    monthlyDeliveries: 3000, peakDailyDeliveries: 100, mode: 'motorcycle' },
});

/** First paid-tier sensitivity model; no free allowance, volume discount, tax or FX assumptions. */
export function estimateCost(provider: Provider, scenario: CostScenario) {
  const fields = ['autocomplete', 'geocode', 'reverse', 'details', 'routes', 'mapLoads', 'tiles',
    'monthlyDeliveries', 'peakDailyDeliveries'] as const;
  if (!['geoapify', 'google', 'mapbox'].includes(provider) || Object.keys(scenario).length !== fields.length + 1) {
    throw new Error('Invalid cost scenario');
  }
  for (const name of fields) {
    const value = scenario[name];
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 || value > 10000000) {
      throw new Error('Invalid cost scenario');
    }
  }
  if (!scenario.monthlyDeliveries || !['driving', 'motorcycle'].includes(scenario.mode)) throw new Error('Invalid cost scenario');
  if (provider === 'geoapify') {
    const credits = scenario.autocomplete + scenario.geocode + scenario.reverse + scenario.routes + scenario.tiles / 4;
    return { provider, basis: 'API10 subscription allocation', usdPerDelivery: 59 / scenario.monthlyDeliveries,
      creditsPerDelivery: credits, peakDailyCredits: credits * scenario.peakDailyDeliveries,
      fitsApi10DailyCredits: credits * scenario.peakDailyDeliveries <= 10000,
      // A selected autocomplete result already contains its coordinate in this scenario.
      details: 'No extra detail API assumed; maps charged through tiles', licensingApprovalRequired: true };
  }
  if (provider === 'google') {
    const components = { autocomplete: scenario.autocomplete * 0.00283,
      geocoding: (scenario.geocode + scenario.reverse) * 0.005, details: scenario.details * 0.005,
      routing: scenario.routes * (scenario.mode === 'motorcycle' ? 0.015 : 0.005), maps: scenario.mapLoads * 0.007 };
    return { provider, basis: 'First paid tier, per-request autocomplete, Dynamic Maps includes tiles',
      usdPerDelivery: Object.values(components).reduce((sum, value) => sum + value, 0), components,
      licensingApprovalRequired: true };
  }
  const components = { autocompleteTemporary: scenario.autocomplete * 0.00075,
    // Final geocode/reverse uses Permanent for the modeled snapshot; confirm contract.
    permanent: (scenario.geocode + scenario.reverse) * 0.005,
    routing: scenario.routes * 0.002, maps: scenario.mapLoads * 0.005 };
  return { provider, basis: 'First paid tier, GL JS includes tiles, temporary suggestions plus Permanent final lookup',
    usdPerDelivery: scenario.mode === 'motorcycle' ? null : Object.values(components).reduce((sum, value) => sum + value, 0),
    components, supportedMode: scenario.mode !== 'motorcycle', licensingApprovalRequired: true };
}
