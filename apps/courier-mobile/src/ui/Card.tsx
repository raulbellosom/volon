import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider.tsx';

/** Raised surface that groups one piece of work (an offer, the active delivery). */
export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.xl,
          borderWidth: 1,
          borderColor: theme.colors['border-subtle'],
          padding: theme.spacing[4],
          gap: theme.spacing[4],
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
