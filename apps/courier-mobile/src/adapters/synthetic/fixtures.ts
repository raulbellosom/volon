import type { CourierIdentity, CourierOffer } from '../../domain/courier.ts';

// Every value here is invented for the demo: no real people, businesses, addresses or
// coordinates. Names say «demo», «ficticia» or «prueba» so they cannot pass for real data.

export const DEMO_COURIER: CourierIdentity = Object.freeze({
  courierId: 'courier_demo_1',
  displayName: 'Repartidor de prueba',
  vehicle: 'motorcycle',
});

/** Offer whose acceptance always loses the race to another (simulated) courier. */
export const CONTESTED_OFFER_ID = 'offer_demo_1043';

interface OfferSeed {
  readonly offer: Omit<CourierOffer, 'expiresAt' | 'status'>;
  /** Seconds from the simulated server start; negative means already expired. */
  readonly expiresInSeconds: number;
}

const SEEDS: readonly OfferSeed[] = [
  {
    expiresInSeconds: 120,
    offer: {
      offerId: 'offer_demo_1042',
      reference: 'DEMO-1042',
      pickup: { title: 'Comercio demo Centro', addressLine: 'Calle Ficticia 12, Colonia Prueba', instructions: 'Pedir en mostrador de prueba' },
      dropoff: { title: 'Colonia Ficticia Norte', addressLine: 'Calle Inventada 45, Colonia Ficticia Norte', instructions: 'Portón azul de prueba' },
      packageNote: 'Bolsa chica',
    },
  },
  {
    expiresInSeconds: 75,
    offer: {
      offerId: CONTESTED_OFFER_ID,
      reference: 'DEMO-1043',
      pickup: { title: 'Cafetería demo Marina', addressLine: 'Avenida Simulada 300, Colonia Prueba', instructions: null },
      dropoff: { title: 'Colonia Ensayo', addressLine: 'Privada de Prueba 8, Colonia Ensayo', instructions: null },
      packageNote: 'Caja mediana',
    },
  },
  {
    expiresInSeconds: -30,
    offer: {
      offerId: 'offer_demo_1044',
      reference: 'DEMO-1044',
      pickup: { title: 'Farmacia demo Sur', addressLine: 'Calle Ejemplo 7, Colonia Prueba', instructions: null },
      dropoff: { title: 'Colonia Muestra', addressLine: 'Andador Ficticio 21, Colonia Muestra', instructions: 'Dejar con vigilancia de prueba' },
      packageNote: 'Sobre',
    },
  },
];

/** Fresh offers anchored to `startedAt` (ms), so every run of the demo behaves the same. */
export function seedOffers(startedAt: number): CourierOffer[] {
  return SEEDS.map(({ offer, expiresInSeconds }) => ({
    ...offer,
    status: 'offered',
    expiresAt: new Date(startedAt + expiresInSeconds * 1000).toISOString(),
  }));
}
