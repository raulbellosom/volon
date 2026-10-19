import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import type { FeedbackTone } from '@delivery/design-tokens';
import { useTheme } from '../theme/ThemeProvider.tsx';
import { AppText } from './AppText.tsx';
import type { IconName } from './Button.tsx';

const ICONS: Record<FeedbackTone, IconName> = {
  info: 'information-circle-outline',
  success: 'checkmark-circle-outline',
  warning: 'warning-outline',
  danger: 'alert-circle-outline',
};

export interface NoticeProps {
  tone: FeedbackTone;
  title: string;
  children?: ReactNode;
  /** Buttons to resolve the situation. */
  actions?: ReactNode;
  /** Announce when it appears (results of a command); leave off for static explanations. */
  live?: boolean;
}

/** Inline message with an icon, never color alone. */
export function Notice({ tone, title, children, actions, live }: NoticeProps) {
  const { theme } = useTheme();
  return (
    <View
      accessibilityLiveRegion={live ? 'polite' : 'none'}
      {...(live ? { accessibilityRole: 'alert' as const } : {})}
      style={{
        flexDirection: 'row',
        gap: theme.spacing[3],
        padding: theme.spacing[4],
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        backgroundColor: theme.colors[`feedback-${tone}-bg`],
        borderColor: theme.colors[`feedback-${tone}-border`],
      }}
    >
      <Ionicons name={ICONS[tone]} size={22} color={theme.colors[`feedback-${tone}-fg`]} accessibilityElementsHidden importantForAccessibility="no" />
      <View style={{ flex: 1, gap: theme.spacing[1] }}>
        <AppText variant="bodyStrong">{title}</AppText>
        {children && (typeof children === 'string' ? <AppText variant="caption">{children}</AppText> : children)}
        {actions && <View style={{ marginTop: theme.spacing[2], gap: theme.spacing[2] }}>{actions}</View>}
      </View>
    </View>
  );
}
