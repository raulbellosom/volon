import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider.tsx';
import { EmptyState } from '../ui/StateViews.tsx';

/** Shown when the build asks for a mode other than demo: there is no courier backend yet. */
export function BlockedModeScreen({ requested }: { requested: string }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, justifyContent: 'center', paddingTop: insets.top, paddingHorizontal: theme.spacing[4], backgroundColor: theme.colors.background }}>
      <EmptyState
        icon="lock-closed-outline"
        title="Modo real no disponible"
        description={`Esta versión solo funciona en modo demostración. Se pidió «${requested}», pero todavía no existe un servicio para repartidores, así que la app no se conecta a ningún servidor.`}
      />
    </View>
  );
}
