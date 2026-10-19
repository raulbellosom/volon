import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider.tsx';
import { AppText } from './AppText.tsx';
import type { IconName } from './Button.tsx';

/** Empty, error or offline state: what happened and the next step. */
export function EmptyState({ icon, title, description, actions }: { icon: IconName; title: string; description: string; actions?: ReactNode }) {
  const { theme } = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: theme.spacing[3], paddingVertical: theme.spacing[10], paddingHorizontal: theme.spacing[4] }}>
      <View style={{ width: 64, height: 64, borderRadius: theme.radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors['surface-selected'] }}>
        <Ionicons name={icon} size={30} color={theme.colors['text-on-secondary']} accessibilityElementsHidden importantForAccessibility="no" />
      </View>
      <AppText variant="heading" align="center" heading>{title}</AppText>
      <AppText variant="caption" color="text-secondary" align="center">{description}</AppText>
      {actions && <View style={{ alignSelf: 'stretch', gap: theme.spacing[3], marginTop: theme.spacing[2] }}>{actions}</View>}
    </View>
  );
}

/** Spinner with its reason, announced to screen readers. */
export function LoadingState({ label }: { label: string }) {
  const { theme } = useTheme();
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={label} style={{ alignItems: 'center', gap: theme.spacing[3], paddingVertical: theme.spacing[10] }}>
      <ActivityIndicator size="large" color={theme.colors['action-primary']} />
      <AppText variant="caption" color="text-secondary">{label}</AppText>
    </View>
  );
}
