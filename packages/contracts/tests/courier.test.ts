import assert from 'node:assert/strict';
import test from 'node:test';
import { parseCourierAvailabilityRequest, parseCourierMeResponse } from '../src/index.ts';

test('courier contracts: exact minimal response, two states, bounded version and real UTC timestamp', () => {
  const request = { status: 'available', expectedVersion: 1 };
  assert.deepEqual(parseCourierAvailabilityRequest(request), request);
  for (const invalid of [null, [], {}, { ...request, status: 'busy' }, { ...request, courierId: 'other' },
    { ...request, subjectId: 'other' }, { ...request, changedAt: 'client-clock' }, { ...request, paymentVerified: true },
    ...[0, -1, 1.5, '1', 2147483647, NaN].map((expectedVersion) => ({ ...request, expectedVersion }))]) {
    assert.throws(() => parseCourierAvailabilityRequest(invalid));
  }
  const dto = { courierId: 'courier_synthetic_a', availability: {
    status: 'offline', version: 1, changedAt: '2026-10-19T00:00:00.000Z' } };
  assert.deepEqual(parseCourierMeResponse(dto), dto);
  for (const invalid of [{ ...dto, subjectId: 'secret' }, { ...dto, displayName: 'PII' },
    { ...dto, availability: { ...dto.availability, status: 'busy' } },
    { ...dto, availability: { ...dto.availability, version: 0 } },
    ...['2026-02-30T00:00:00.000Z', 'local-time', '2026-10-19T00:00:00.000+00:00']
      .map((changedAt) => ({ ...dto, availability: { ...dto.availability, changedAt } }))]) {
    assert.throws(() => parseCourierMeResponse(invalid));
  }
});
