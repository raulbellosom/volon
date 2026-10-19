/**
 * Fail-closed mode gate. The only runnable mode is `demo` (synthetic adapter, no network).
 * A real courier backend does not exist yet: asking for any other mode, or an unknown value,
 * blocks the app instead of silently falling back to demo or calling an API.
 */
export type AppMode = { kind: 'demo' } | { kind: 'blocked'; requested: string };

export function resolveAppMode(requested: string | undefined = process.env.EXPO_PUBLIC_COURIER_MODE): AppMode {
  const value = requested?.trim() ?? '';
  if (value === '' || value === 'demo') return { kind: 'demo' };
  return { kind: 'blocked', requested: value };
}
