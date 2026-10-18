import { useEffect, useSyncExternalStore } from 'react';
import { themeStore, type ResolvedTheme, type ThemePreference } from './theme-store.ts';

export interface UseThemeResult {
  /** What the person chose: light, dark or follow the system. */
  preference: ThemePreference;
  /** What is actually painted right now. */
  resolvedTheme: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
}

/** Reads and changes the Volon theme; persists the choice and writes `data-theme` on `<html>`. */
export function useTheme(): UseThemeResult {
  const { preference, resolvedTheme } = useSyncExternalStore(
    themeStore.subscribe,
    themeStore.getSnapshot,
    themeStore.getServerSnapshot,
  );

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
  }, [resolvedTheme]);

  return { preference, resolvedTheme, setPreference: themeStore.setPreference };
}
