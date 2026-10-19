const DATE_TIME = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Mexico_City' });
const TIME = new Intl.DateTimeFormat('es-MX', { timeStyle: 'short', timeZone: 'America/Mexico_City' });

/** «18 oct 2026, 14:05» in Puerto Vallarta's time zone. */
export function formatDateTime(iso: string): string {
  return DATE_TIME.format(new Date(iso));
}

/** «14:05» in Puerto Vallarta's time zone. */
export function formatTime(iso: string): string {
  return TIME.format(new Date(iso));
}
