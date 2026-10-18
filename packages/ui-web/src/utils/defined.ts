type Defined<T> = { [K in keyof T]?: Exclude<T[K], undefined> };

/**
 * Drops `undefined` entries so optional props can be forwarded to third-party components
 * under `exactOptionalPropertyTypes` without lying about the type.
 */
export function defined<T extends object>(values: T): Defined<T> {
  return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined)) as Defined<T>;
}
