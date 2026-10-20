import type { DeliveryLocationsResponse, DeliveryQuoteResponse, DeliveryResponse, MeResponse } from '../api/merchant-api.ts';

// Synthetic data for local design work only. Names say «demo» on purpose so no screen
// rendered from them can be mistaken for a real merchant, branch or price.

export const DEMO_SUBJECT_ID = '00000000-0000-4000-8000-000000000001';
const DEMO_MERCHANT_ID = 'merchant_demo';

/** Emails that trigger specific demo states on sign-in. */
export const DEMO_EMAILS = {
  ok: 'comercio@demo.test',
  forbidden: 'sin-acceso@demo.test',
  noBranches: 'sin-sucursales@demo.test',
} as const;

/** Delivery ids that trigger error states on the status screen. */
export const DEMO_DELIVERY_ERRORS = { forbidden: 'demo-prohibido', unavailable: 'demo-caido' } as const;

/** Seconds a demo quote stays valid; short so the expired state is easy to see. */
export const DEMO_QUOTE_SECONDS = 90;

export const demoMe: MeResponse = {
  subjectId: DEMO_SUBJECT_ID,
  memberships: [
    { merchant: { merchantId: DEMO_MERCHANT_ID, name: 'Comercio demo' }, branch: { branchId: 'branch_demo_centro', name: 'Sucursal demo Centro' } },
    { merchant: { merchantId: DEMO_MERCHANT_ID, name: 'Comercio demo' }, branch: { branchId: 'branch_demo_marina', name: 'Sucursal demo Marina' } },
    // Deliberately long name: keeps narrow layouts honest (header, menus, branch picker).
    { merchant: { merchantId: DEMO_MERCHANT_ID, name: 'Comercio demo' }, branch: { branchId: 'branch_demo_plaza', name: 'Sucursal demo Plaza Comercial Marina Vallarta Norte' } },
  ],
};

/** Illustrative amounts, not a rate: real prices come only from the pricing service. */
export function demoQuote(sequence: number, now: number): DeliveryQuoteResponse {
  const distance = 1500 + (sequence % 3) * 1000;
  return {
    quoteId: `quote_demo_${sequence}`,
    expiresAt: new Date(now + DEMO_QUOTE_SECONDS * 1000).toISOString(),
    currency: 'MXN',
    amountMinor: 3500 + distance,
    lines: [
      { code: 'base_delivery', amountMinor: 3500 },
      { code: 'distance_delivery', amountMinor: distance },
    ],
    coverage: 'eligible',
  };
}

/** Branch with enough synthetic history to page through; the other demo branch starts empty. */
export const DEMO_HISTORY_BRANCH = 'branch_demo_centro';
const DEMO_HISTORY_SIZE = 23;

/** Past synthetic requests, newest first, spaced 97 minutes apart. Only `requested` exists today. */
export function demoHistory(now: number): DeliveryResponse[] {
  return Array.from({ length: DEMO_HISTORY_SIZE }, (_, index) => {
    const distance = 1500 + (index % 3) * 1000;
    return {
      deliveryId: `delivery_demo_h${String(index + 1).padStart(2, '0')}`,
      publicReference: `VL-26-7K9M${'23456789ABCDEFGHJKMNPQRSTVWXYZ'[Math.floor(index / 30)]}${'23456789ABCDEFGHJKMNPQRSTVWXYZ'[index % 30]}`,
      branchId: DEMO_HISTORY_BRANCH,
      quoteId: `quote_demo_h${index + 1}`,
      status: 'requested',
      version: 1,
      createdAt: new Date(now - (index + 1) * 97 * 60_000).toISOString(),
      pricing: {
        amountMinor: 3500 + distance,
        currency: 'MXN',
        lines: [{ code: 'base_delivery', amountMinor: 3500 }, { code: 'distance_delivery', amountMinor: distance }],
        rateVersion: 'demo',
      },
    };
  });
}

/** Seeded history predates stored addresses, like real `legacy_input` records. */
export function legacyLocations(branchId: string): DeliveryLocationsResponse {
  return {
    branchId,
    pickup: { coordinates: { lat: 0, lng: 0 }, source: 'legacy_input', verification: 'unverified' },
    dropoff: { coordinates: { lat: 0.01, lng: 0.01 }, addressLine: null, instructions: null, source: 'legacy_input', verification: 'unverified' },
  };
}
