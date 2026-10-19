import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider.tsx';
import { AppText } from './AppText.tsx';

export interface StopBlockProps {
  kind: 'pickup' | 'dropoff';
  title: string;
  addressLine: string;
  instructions?: string | null;
  /** Hides address and notes for the compact offer list. */
  compact?: boolean;
}

/** Pickup or drop-off as text only: no map, route or arrival time is drawn or estimated. */
export function StopBlock({ kind, title, addressLine, instructions, compact }: StopBlockProps) {
  const { theme } = useTheme();
  const pickup = kind === 'pickup';
  const label = pickup ? 'Recoger en' : 'Entregar en';
  return (
    <View
      accessible
      accessibilityLabel={[label, title, compact ? null : addressLine, !compact && instructions ? `Indicaciones: ${instructions}` : null].filter(Boolean).join('. ')}
      style={{ flexDirection: 'row', gap: theme.spacing[3] }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: theme.radius.full,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: pickup ? theme.colors['surface-selected'] : theme.colors['selection-fill'],
        }}
      >
        <Ionicons name={pickup ? 'storefront-outline' : 'location-outline'} size={20} color={pickup ? theme.colors['text-on-secondary'] : theme.colors['selection-mark']} />
      </View>
      <View style={{ flex: 1, gap: theme.spacing[0.5] }}>
        <AppText variant="overline" color="text-secondary">{label}</AppText>
        <AppText variant="bodyStrong">{title}</AppText>
        {!compact && <AppText variant="caption" color="text-secondary">{addressLine}</AppText>}
        {!compact && instructions && <AppText variant="caption">Indicaciones: {instructions}</AppText>}
      </View>
    </View>
  );
}
