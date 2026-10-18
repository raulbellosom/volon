/** Display-only formatters for es-MX. They never compute money: amounts arrive in centavos. */

const MXN = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
const DECIMAL = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 });

/** 125050 → «$1,250.50». Rejects non-integer input so floats never sneak into money. */
export function formatMXN(amountMinor: number): string {
  if (!Number.isSafeInteger(amountMinor)) throw new RangeError('amountMinor must be an integer number of centavos');
  return MXN.format(amountMinor / 100);
}

/** 850 → «850 m», 3240 → «3.2 km». */
export function formatDistance(meters: number): string {
  return meters < 1000 ? `${Math.round(meters)} m` : `${DECIMAL.format(meters / 1000)} km`;
}

/** 25 → «25 min», 65 → «1 h 05 min». */
export function formatDuration(minutes: number): string {
  const rounded = Math.max(0, Math.round(minutes));
  if (rounded < 60) return `${rounded} min`;
  const hours = Math.floor(rounded / 60);
  const rest = rounded % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${String(rest).padStart(2, '0')} min`;
}
