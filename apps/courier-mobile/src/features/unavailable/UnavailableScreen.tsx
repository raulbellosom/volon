import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider.tsx';
import { AppText } from '../../ui/AppText.tsx';
import type { IconName } from '../../ui/Button.tsx';
import { Card } from '../../ui/Card.tsx';
import { Screen } from '../../ui/Screen.tsx';

const FEATURES: readonly { icon: IconName; title: string; reason: string }[] = [
  { icon: 'navigate-outline', title: 'Ubicación y GPS', reason: 'La app no pide permiso de ubicación ni comparte dónde estás.' },
  { icon: 'map-outline', title: 'Mapas y navegación', reason: 'No se dibujan rutas ni se calculan tiempos de llegada.' },
  { icon: 'camera-outline', title: 'Cámara y evidencia de entrega', reason: 'No se toman fotos ni firmas.' },
  { icon: 'notifications-outline', title: 'Notificaciones', reason: 'Las ofertas no llegan como avisos; se consultan en la lista.' },
  { icon: 'wallet-outline', title: 'Pagos y ganancias', reason: 'No se muestran ni se calculan cobros, propinas o pagos.' },
  { icon: 'git-network-outline', title: 'Despacho real', reason: 'El servidor todavía no genera ofertas ni asignaciones.' },
];

/** What this demo deliberately does not do, so nobody assumes it works. */
export function UnavailableScreen() {
  const { theme } = useTheme();
  return (
    <Screen>
      <AppText color="text-secondary">
        Estas funciones llegarán en versiones posteriores, después de probarlas en teléfonos reales y aprobar su privacidad.
      </AppText>
      <Card>
        {FEATURES.map((feature) => (
          <View key={feature.title} accessible accessibilityLabel={`${feature.title}: no disponible. ${feature.reason}`} style={{ flexDirection: 'row', gap: theme.spacing[3] }}>
            <Ionicons name={feature.icon} size={22} color={theme.colors['text-secondary']} />
            <View style={{ flex: 1, gap: theme.spacing[0.5] }}>
              <AppText variant="bodyStrong">{feature.title}</AppText>
              <AppText variant="caption" color="text-secondary">No disponible · {feature.reason}</AppText>
            </View>
          </View>
        ))}
      </Card>
    </Screen>
  );
}
