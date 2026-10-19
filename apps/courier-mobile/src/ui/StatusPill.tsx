import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';
import type { ColorTokenName } from '@delivery/design-tokens';
import { useTheme } from '../theme/ThemeProvider.tsx';
import { AppText } from './AppText.tsx';
import type { IconName } from './Button.tsx';

export type PillTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'progress';

const TONES: Record<PillTone, { bg: ColorTokenName; fg: ColorTokenName }> = {
  neutral: { bg: 'surface-sunken', fg: 'text-secondary' },
  info: { bg: 'feedback-info-bg', fg: 'feedback-info-fg' },
  success: { bg: 'feedback-success-bg', fg: 'feedback-success-fg' },
  warning: { bg: 'feedback-warning-bg', fg: 'feedback-warning-fg' },
  danger: { bg: 'feedback-danger-bg', fg: 'feedback-danger-fg' },
  progress: { bg: 'status-in-transit-bg', fg: 'status-in-transit-fg' },
};

/** Short state label with icon and text, so it never depends on color alone. */
export function StatusPill({ label, tone = 'neutral', icon }: { label: string; tone?: PillTone; icon?: IconName }) {
  const { theme } = useTheme();
  const { bg, fg } = TONES[tone];
  return (
    <View
      style={{
        flexDirection: 'row',
        alignSelf: 'flex-start',
        alignItems: 'center',
        gap: theme.spacing[1.5],
        paddingHorizontal: theme.spacing[3],
        paddingVertical: theme.spacing[1],
        borderRadius: theme.radius.full,
        backgroundColor: theme.colors[bg],
      }}
    >
      {icon && <Ionicons name={icon} size={14} color={theme.colors[fg]} accessibilityElementsHidden importantForAccessibility="no" />}
      <AppText variant="label" color={fg}>{label}</AppText>
    </View>
  );
}
