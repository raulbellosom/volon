import { createContext, use, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AccessibilityInfo, useColorScheme } from 'react-native';
import { buildTheme, type AppTheme } from './theme.ts';

export type ThemePreference = 'system' | 'light' | 'dark';

interface ThemeValue {
  readonly theme: AppTheme;
  readonly preference: ThemePreference;
  setPreference(preference: ThemePreference): void;
  /** Mirrors the OS «reduce motion» setting; components skip non-essential animation. */
  readonly reduceMotion: boolean;
}

const ThemeContext = createContext<ThemeValue | null>(null);

function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => alive && setReduce(value));
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      alive = false;
      subscription.remove();
    };
  }, []);
  return reduce;
}

export function ThemeProvider({ children, initialPreference = 'system' }: { children: ReactNode; initialPreference?: ThemePreference }) {
  const system = useColorScheme();
  const [preference, setPreference] = useState<ThemePreference>(initialPreference);
  const reduceMotion = useReduceMotion();
  const name = preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;
  const value = useMemo<ThemeValue>(() => ({ theme: buildTheme(name), preference, setPreference, reduceMotion }), [name, preference, reduceMotion]);
  return <ThemeContext value={value}>{children}</ThemeContext>;
}

export function useTheme(): ThemeValue {
  const value = use(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside <ThemeProvider>.');
  return value;
}
