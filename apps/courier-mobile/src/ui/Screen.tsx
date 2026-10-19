import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider.tsx';
import { useModeBanner } from './ModeBanner.tsx';

export interface ScreenProps {
  children: ReactNode;
  /**
   * Main actions pinned to the bottom, inside the thumb zone and above the home indicator.
   * They stay reachable with one hand however long the content is.
   */
  footer?: ReactNode;
  /** Hides the mode banner (only for the blocked-mode screen). */
  bare?: boolean;
}

/** Page frame: safe areas, scrolling body, mode banner and a sticky action footer. */
export function Screen({ children, footer, bare }: ScreenProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const banner = useModeBanner();
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {!bare && banner}
      <ScrollView
        contentContainerStyle={{ padding: theme.spacing[4], gap: theme.spacing[5], paddingBottom: footer ? theme.spacing[6] : insets.bottom + theme.spacing[6] }}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
      {footer && (
        <View
          style={{
            gap: theme.spacing[3],
            paddingHorizontal: theme.spacing[4],
            paddingTop: theme.spacing[3],
            paddingBottom: insets.bottom + theme.spacing[3],
            backgroundColor: theme.colors.surface,
            borderTopWidth: 1,
            borderTopColor: theme.colors['border-subtle'],
          }}
        >
          {footer}
        </View>
      )}
    </View>
  );
}
