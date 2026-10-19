export const PUBLIC_REFERENCE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';
export const PUBLIC_REFERENCE_PATTERN = /^[A-Z]{2,4}-[0-9]{2}-[23456789ABCDEFGHJKMNPQRSTVWXYZ]{6,10}$/;
export class InvalidPublicReference extends Error {
  constructor() { super('Folio inválido.'); }
}
/** Complete input only. Canonical references themselves are never rewritten in storage. */
export function normalizePublicReference(value: unknown): string {
  if (typeof value !== 'string' || value.length > 32 || !/^[A-Za-z0-9 -]+$/.test(value)) throw new InvalidPublicReference();
  const match = /^([A-Z]{2,4})[- ]?([0-9]{2})[- ]?([23456789ABCDEFGHJKMNPQRSTVWXYZ]{6,10})$/.exec(value.trim().toUpperCase());
  if (!match) throw new InvalidPublicReference();
  return `${match[1]}-${match[2]}-${match[3]}`;
}
