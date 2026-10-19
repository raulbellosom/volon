import { describe, expect, it } from 'vitest';
import { buildQuoteRequest, codePoints, destinationErrors, normalizeLine } from './destination-input.ts';

const base = { branchId: 'b1', pickup: { lat: 0, lng: 0 }, dropoff: { lat: 0.01, lng: 0.01 } };

describe('synthetic destination input', () => {
  it('turns any text into one trimmed line without control characters', () => {
    expect(normalizeLine('  Calle\n\tSintética   1\u0007 ')).toBe('Calle Sintética 1');
    expect(normalizeLine('a b')).toBe('a b');
  });

  it('counts Unicode code points like the contract', () => {
    expect(codePoints('🚚'.repeat(240))).toBe(240);
    expect(destinationErrors('🚚'.repeat(240), '')).toEqual({});
    expect(destinationErrors('🚚'.repeat(241), '').address).toMatch(/llevas 241/);
    expect(destinationErrors('Calle 1', 'x'.repeat(501)).instructions).toMatch(/llevas 501/);
    expect(destinationErrors('   ', '').address).toBe('Escribe una dirección de prueba.');
  });

  it('builds a request the shared parser accepts, omitting empty instructions', () => {
    expect(buildQuoteRequest({ ...base, address: ' Calle 1 ', instructions: '  ' })?.destination)
      .toEqual({ addressLine: 'Calle 1', source: 'synthetic', verification: 'unverified' });
    expect(buildQuoteRequest({ ...base, address: '', instructions: '' })).toBeNull();
    expect(buildQuoteRequest({ ...base, branchId: 'bad id', address: 'Calle 1', instructions: '' })).toBeNull();
  });
});
