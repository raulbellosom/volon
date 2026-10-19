/** Only synthetic, unverified addresses are accepted in this increment. */
export interface DeliveryDestination {
  readonly addressLine: string;
  readonly instructions?: string;
  readonly source: 'synthetic';
  readonly verification: 'unverified';
}

function text(value: unknown, maximum: number): value is string {
  return typeof value === 'string' && value.trim() === value && value.length > 0
    && [...value].length <= maximum && !/[\p{Cc}\p{Cs}\p{Zl}\p{Zp}]/u.test(value);
}

export function parseDeliveryDestination(value: unknown): DeliveryDestination {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('Invalid destination');
  const record = value as Record<string, unknown>;
  const keys = ['addressLine', 'source', 'verification', ...(Object.hasOwn(record, 'instructions') ? ['instructions'] : [])];
  if (Object.keys(record).length !== keys.length || !keys.every((key) => Object.hasOwn(record, key))
    || !text(record.addressLine, 240) || record.source !== 'synthetic' || record.verification !== 'unverified'
    || (Object.hasOwn(record, 'instructions') && !text(record.instructions, 500))) throw new Error('Invalid destination');
  return Object.freeze({ addressLine: record.addressLine, source: 'synthetic', verification: 'unverified',
    ...(typeof record.instructions === 'string' ? { instructions: record.instructions } : {}) });
}
