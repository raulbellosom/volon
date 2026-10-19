import type { DeliveryQuoteResponse, MeResponse } from '../api/merchant-api.ts';

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
