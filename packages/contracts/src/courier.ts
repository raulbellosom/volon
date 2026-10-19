export type CourierAvailabilityStatus = 'offline' | 'available';
export interface CourierAvailabilityRequest {
  readonly status: CourierAvailabilityStatus;
  readonly expectedVersion: number;
}
export interface CourierMeResponse {
  readonly courierId: string;
  readonly availability: {
    readonly status: CourierAvailabilityStatus;
    readonly version: number;
    readonly changedAt: string;
  };
}
export class InvalidCourierRequest extends Error {
  constructor() { super('Solicitud de disponibilidad inválida.'); }
}
export class InvalidCourierResponse extends Error {
  constructor() { super('Invalid courier response'); }
}
function shape(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    && Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}
function status(value: unknown): value is CourierAvailabilityStatus {
  return value === 'offline' || value === 'available';
}
function version(value: unknown, maximum: number): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 1 && value <= maximum;
}
export function parseCourierAvailabilityRequest(value: unknown): CourierAvailabilityRequest {
  if (!shape(value, ['status', 'expectedVersion']) || !status(value.status)
    || !version(value.expectedVersion, 2147483646)) throw new InvalidCourierRequest();
  return Object.freeze({ status: value.status, expectedVersion: value.expectedVersion });
}
export function parseCourierMeResponse(value: unknown): CourierMeResponse {
  if (!shape(value, ['courierId', 'availability']) || typeof value.courierId !== 'string'
    || !/^[A-Za-z0-9_-]{1,128}$/.test(value.courierId)
    || !shape(value.availability, ['status', 'version', 'changedAt'])) throw new InvalidCourierResponse();
  const row = value.availability;
  if (!status(row.status) || !version(row.version, 2147483647) || typeof row.changedAt !== 'string'
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(row.changedAt)
    || !Number.isFinite(Date.parse(row.changedAt))
    || new Date(row.changedAt).toISOString() !== row.changedAt) throw new InvalidCourierResponse();
  return Object.freeze({ courierId: value.courierId,
    availability: Object.freeze({ status: row.status, version: row.version, changedAt: row.changedAt }) });
}
