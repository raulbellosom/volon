export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'volon-theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

/**
 * Inline this in `<head>` before the stylesheet so the stored theme applies before the
 * first paint (avoids a light flash for dark users).
 */
export const themeInitScript = `(function(){try{var p=localStorage.getItem('${THEME_STORAGE_KEY}');` +
  `var d=p==='dark'||(p!=='light'&&matchMedia('${DARK_QUERY}').matches);` +
  `document.documentElement.dataset.theme=d?'dark':'light';}catch(e){}})();`;

function isPreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

function readStoredPreference(): ThemePreference {
  try {
    const stored = globalThis.localStorage?.getItem(THEME_STORAGE_KEY);
    return isPreference(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

function systemPrefersDark(): boolean {
  return typeof globalThis.matchMedia === 'function' && globalThis.matchMedia(DARK_QUERY).matches;
}

export function resolveTheme(preference: ThemePreference, prefersDark = systemPrefersDark()): ResolvedTheme {
  return preference === 'system' ? (prefersDark ? 'dark' : 'light') : preference;
}

type Snapshot = { preference: ThemePreference; resolvedTheme: ResolvedTheme };

let snapshot: Snapshot | undefined;
const listeners = new Set<() => void>();

function apply(preference: ThemePreference): void {
  snapshot = { preference, resolvedTheme: resolveTheme(preference) };
  if (typeof document !== 'undefined') document.documentElement.dataset.theme = snapshot.resolvedTheme;
  for (const listener of listeners) listener();
}

/** Shared store so every `useTheme` caller (toggle, navbar, charts) stays in sync. */
export const themeStore = {
  getSnapshot(): Snapshot {
    if (!snapshot) {
      const preference = readStoredPreference();
      snapshot = { preference, resolvedTheme: resolveTheme(preference) };
    }
    return snapshot;
  },
  getServerSnapshot(): Snapshot {
    return { preference: 'system', resolvedTheme: 'light' };
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    const media = typeof globalThis.matchMedia === 'function' ? globalThis.matchMedia(DARK_QUERY) : undefined;
    const onSystemChange = () => {
      if (themeStore.getSnapshot().preference === 'system') apply('system');
    };
    media?.addEventListener('change', onSystemChange);
    return () => {
      listeners.delete(listener);
      media?.removeEventListener('change', onSystemChange);
    };
  },
  setPreference(preference: ThemePreference): void {
    try {
      globalThis.localStorage?.setItem(THEME_STORAGE_KEY, preference);
    } catch {
      // Storage can be blocked (private mode); the choice still applies for this session.
    }
    apply(preference);
  },
};
