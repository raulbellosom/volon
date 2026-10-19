import { randomInt } from 'node:crypto';
import { PUBLIC_REFERENCE_ALPHABET } from '@delivery/contracts';
import { brand } from '@delivery/branding';

export function validateReferencePrefix(prefix: string): string {
  if (!/^[A-Z]{2,4}$/.test(prefix)) throw new Error('Invalid delivery reference prefix');
  return prefix;
}
/** DB supplies issuance time; optional random source is solely a deterministic test seam. */
export function generatePublicReference(time: Date, prefix: string = brand.deliveryReferencePrefix, sample = randomInt): string {
  validateReferencePrefix(prefix);
  if (!Number.isFinite(time.getTime())) throw new Error('Invalid issuance time');
  const suffix = Array.from({ length: 6 }, () => {
    const index = sample(PUBLIC_REFERENCE_ALPHABET.length);
    const character = PUBLIC_REFERENCE_ALPHABET[index];
    if (!Number.isInteger(index) || !character) throw new Error('Invalid random source');
    return character;
  }).join('');
  return `${prefix}-${String(time.getUTCFullYear()).slice(-2).padStart(2, '0')}-${suffix}`;
}
export async function allocatePublicReference(time: Date, insert: (reference: string) => Promise<boolean>,
  next: (time: Date) => string = generatePublicReference): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const reference = next(time);
    if (await insert(reference)) return reference;
  }
  throw new Error('Reference generation exhausted');
}
