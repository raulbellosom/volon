import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider.tsx';
import { EmptyState } from '../ui/StateViews.tsx';

/** Shown when the configuration asks for a mode this build cannot run safely. Never falls back to demo. */
export function BlockedModeScreen({ requested, reason }: { requested: string; reason: string }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, justifyContent: 'center', paddingTop: insets.top, paddingHorizontal: theme.spacing[4], backgroundColor: theme.colors.background }}>
      <EmptyState
        icon="lock-closed-outline"
        title="La app está bloqueada"
        description={`Se pidió el modo «${requested}». ${reason} La app no se conecta a ningún servidor ni cambia sola al modo de demostración.`}
      />
    </View>
  );
}
