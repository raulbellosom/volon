import { parseDeliveryQuoteRequest, type DeliveryQuoteRequest, type QuotePoint } from '@delivery/contracts';

export const ADDRESS_MAX = 240;
export const INSTRUCTIONS_MAX = 500;

/** Characters as the contract counts them: Unicode code points, not UTF-16 units. */
export const codePoints = (text: string): number => [...text].length;

/**
 * One trimmed line, as the contract requires: line breaks, tabs and repeated spaces become one
 * space; control characters and lone surrogates are dropped.
 */
export function normalizeLine(text: string): string {
  return text.replace(/\p{Cs}/gu, '').replace(/[\s\p{Cc}\p{Zl}\p{Zp}]+/gu, ' ').trim();
}

export interface DestinationErrors {
  address?: string;
  instructions?: string;
}

export function destinationErrors(address: string, instructions: string): DestinationErrors {
  const line = normalizeLine(address);
  const notes = normalizeLine(instructions);
  const errors: DestinationErrors = {};
  if (!line) errors.address = 'Escribe una dirección de prueba.';
  else if (codePoints(line) > ADDRESS_MAX) errors.address = `Usa como máximo ${ADDRESS_MAX} caracteres; llevas ${codePoints(line)}.`;
  if (codePoints(notes) > INSTRUCTIONS_MAX) errors.instructions = `Usa como máximo ${INSTRUCTIONS_MAX} caracteres; llevas ${codePoints(notes)}.`;
  return errors;
}

/**
 * Builds the quote body with the synthetic, unverified destination and checks it with the shared
 * contract parser before it leaves the browser. Returns `null` when the input is not acceptable.
 */
export function buildQuoteRequest(input: {
  branchId: string;
  pickup: QuotePoint;
  dropoff: QuotePoint;
  address: string;
  instructions: string;
}): DeliveryQuoteRequest | null {
  if (Object.keys(destinationErrors(input.address, input.instructions)).length > 0) return null;
  const instructions = normalizeLine(input.instructions);
  try {
    return parseDeliveryQuoteRequest({
      branchId: input.branchId,
      pickup: input.pickup,
      dropoff: input.dropoff,
      serviceType: 'local_delivery',
      destination: {
        addressLine: normalizeLine(input.address),
        ...(instructions ? { instructions } : {}),
        source: 'synthetic',
        verification: 'unverified',
      },
    });
  } catch {
    return null;
  }
}
