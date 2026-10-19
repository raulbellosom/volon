import { GatewayError } from '../../ports/courier-gateway.ts';
import { CONTESTED_OFFER_ID, seedOffers } from './fixtures.ts';
import { createSyntheticGateway } from './synthetic-gateway.ts';

const START = Date.parse('2026-10-18T18:00:00.000Z');

function setup() {
  const clock = { now: START };
  const { gateway, controls } = createSyntheticGateway({ now: () => clock.now, latencyMs: 0 });
  return { gateway, controls, clock };
}

const kind = (promise: Promise<unknown>) => promise.then(() => 'ok', (error: unknown) => (error instanceof GatewayError ? error.kind : 'other'));

describe('synthetic courier gateway', () => {
  it('seeds the same fictitious offers for the same start time', () => {
    expect(seedOffers(START)).toEqual(seedOffers(START));
    for (const offer of seedOffers(START)) {
      expect(`${offer.pickup.title} ${offer.dropoff.addressLine}`).toMatch(/demo|Ficticia|Prueba|Inventada|Ensayo|Muestra/);
    }
  });

  it('shows offers only while available and empties them when offline', async () => {
    const { gateway } = setup();
    expect((await gateway.listOffers()).offers).toHaveLength(0);
    await gateway.setAvailability(true);
    const inbox = await gateway.listOffers();
    expect(inbox.offers.map((offer) => offer.reference)).toEqual(['DEMO-1042', 'DEMO-1043', 'DEMO-1044']);
    expect(inbox.serverTime).toBe(new Date(START).toISOString());
  });

  it('accepts once per idempotency key and marks the shift busy', async () => {
    const { gateway } = setup();
    await gateway.setAvailability(true);
    const first = await gateway.acceptOffer('offer_demo_1042', 'k1');
    const replay = await gateway.acceptOffer('offer_demo_1042', 'k1');
    expect(replay).toBe(first);
    expect(await kind(gateway.acceptOffer('offer_demo_1042', 'k2'))).toBe('conflict');
    expect(await gateway.setAvailability(false)).toBe('busy');
  });

  it('rejects expired and contested offers', async () => {
    const { gateway, clock } = setup();
    await gateway.setAvailability(true);
    expect(await kind(gateway.acceptOffer('offer_demo_1044', 'a'))).toBe('offer-expired');
    expect(await kind(gateway.acceptOffer(CONTESTED_OFFER_ID, 'b'))).toBe('conflict');
    clock.now += 121_000;
    expect(await kind(gateway.acceptOffer('offer_demo_1042', 'c'))).toBe('offer-expired');
  });

  it('moves one step at a time and refuses a stale step', async () => {
    const { gateway } = setup();
    await gateway.setAvailability(true);
    const { assignmentId } = await gateway.acceptOffer('offer_demo_1042', 'k');
    expect((await gateway.advance(assignmentId, 'accepted', 's1')).stage).toBe('to_pickup');
    expect(await kind(gateway.advance(assignmentId, 'accepted', 's2'))).toBe('conflict');
    let stage = (await gateway.advance(assignmentId, 'to_pickup', 's3')).stage;
    for (const key of ['s4', 's5', 's6']) stage = (await gateway.advance(assignmentId, stage, key)).stage;
    expect(stage).toBe('delivered');
    expect(await gateway.setAvailability(true)).toBe('available');
  });

  it('simulates offline, one-off failures and a reset', async () => {
    const { gateway, controls } = setup();
    controls.setOffline(true);
    expect(await kind(gateway.signIn())).toBe('offline');
    controls.setOffline(false);
    controls.failNext('unavailable');
    expect(await kind(gateway.signIn())).toBe('unavailable');
    expect(await kind(gateway.signIn())).toBe('ok');
    await gateway.setAvailability(true);
    await gateway.declineOffer('offer_demo_1042', 'd');
    controls.reset();
    await gateway.setAvailability(true);
    expect((await gateway.listOffers()).offers).toHaveLength(3);
  });
});
