import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider.tsx';
import { AppText } from './AppText.tsx';

/** Always visible: every screen of this build runs on synthetic data. */
export function DemoBanner() {
  const { theme } = useTheme();
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel="Modo demostración: datos ficticios. No hay despacho, ubicación ni pagos reales."
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing[2],
        paddingHorizontal: theme.spacing[4],
        paddingVertical: theme.spacing[2],
        backgroundColor: theme.colors['feedback-warning-bg'],
      }}
    >
      <Ionicons name="flask-outline" size={16} color={theme.colors['feedback-warning-fg']} />
      <AppText variant="label" color="feedback-warning-fg" style={{ flex: 1 }}>
        Modo demostración · datos ficticios, sin despacho real
      </AppText>
    </View>
  );
}
