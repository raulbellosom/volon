import { seedOffers } from '../adapters/synthetic/fixtures.ts';
import { nextStage, WORKFLOW_STAGES } from '../domain/workflow.ts';
import { courierReducer, initialState } from './courier-store.ts';

const offers = seedOffers(Date.parse('2026-10-18T18:00:00.000Z'));
const offer = offers[0]!;

describe('courier reducer', () => {
  it('clears the inbox when the shift goes offline', () => {
    const loaded = courierReducer(initialState, { type: 'inbox/done', offers, serverOffsetMs: 0 });
    const offline = courierReducer(loaded, { type: 'shift/done', shift: 'offline' });
    expect(offline.inbox.offers).toHaveLength(0);
  });

  it('moves an accepted offer into the active delivery and marks the shift busy', () => {
    let state = courierReducer(initialState, { type: 'inbox/done', offers, serverOffsetMs: 0 });
    state = courierReducer(state, { type: 'offer/start', offerId: offer.offerId, command: 'accept' });
    expect(state.commands[offer.offerId]).toBe('accept');
    state = courierReducer(state, { type: 'offer/accepted', offerId: offer.offerId, active: { assignmentId: 'a', offer, stage: 'accepted', updatedAt: '' } });
    expect(state.commands).toEqual({});
    expect(state.inbox.offers.map((item) => item.offerId)).not.toContain(offer.offerId);
    expect(state.shift).toBe('busy');
  });

  it('keeps a failed offer listed with its error and frees the button', () => {
    let state = courierReducer(initialState, { type: 'inbox/done', offers, serverOffsetMs: 0 });
    state = courierReducer(state, { type: 'offer/start', offerId: offer.offerId, command: 'accept' });
    state = courierReducer(state, { type: 'offer/fail', offerId: offer.offerId, error: 'offline' });
    expect(state.offerErrors[offer.offerId]).toBe('offline');
    expect(state.commands[offer.offerId]).toBeUndefined();
    expect(state.inbox.offers).toHaveLength(3);
  });

  it('frees the shift once the simulated delivery is completed and resets on sign out', () => {
    const delivered = courierReducer({ ...initialState, shift: 'busy' }, { type: 'step/done', active: { assignmentId: 'a', offer, stage: 'delivered', updatedAt: '' } });
    expect(delivered.shift).toBe('available');
    expect(courierReducer(delivered, { type: 'signOut' })).toEqual(initialState);
  });
});

describe('workflow', () => {
  it('walks every proposed step in order and stops at delivered', () => {
    const visited = [WORKFLOW_STAGES[0].id as string];
    let stage = nextStage('accepted');
    while (stage) {
      visited.push(stage);
      stage = nextStage(stage);
    }
    expect(visited).toEqual(['accepted', 'to_pickup', 'at_pickup', 'picked_up', 'to_dropoff', 'delivered']);
  });
});
