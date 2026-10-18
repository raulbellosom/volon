import { Monitor, Moon, Sun } from 'lucide-react';
import { SegmentedControl, type SegmentedItem } from '../components/actions/SegmentedControl.tsx';
import type { ThemePreference } from './theme-store.ts';
import { useTheme } from './useTheme.ts';

const ITEMS: readonly SegmentedItem<ThemePreference>[] = [
  { id: 'light', label: 'Claro', icon: <Sun /> },
  { id: 'dark', label: 'Oscuro', icon: <Moon /> },
  { id: 'system', label: 'Sistema', icon: <Monitor /> },
];

export interface ThemeToggleProps {
  /** Icon-only version for navbars and tight spaces. */
  compact?: boolean;
  className?: string;
}

/** Light / dark / system switch. The choice persists and syncs across every toggle. */
export function ThemeToggle({ compact, className }: ThemeToggleProps) {
  const { preference, setPreference } = useTheme();
  return (
    <SegmentedControl
      aria-label="Tema de color"
      items={ITEMS}
      selectedKey={preference}
      onSelectionChange={setPreference}
      size={compact ? 'sm' : 'md'}
      {...(compact ? { iconOnly: true } : {})}
      {...(className ? { className } : {})}
    />
  );
}
