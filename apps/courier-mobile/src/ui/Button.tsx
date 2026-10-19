import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import type { ColorTokenName } from '@delivery/design-tokens';
import { useTheme } from '../theme/ThemeProvider.tsx';
import { AppText } from './AppText.tsx';

export type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'danger' | 'ghost';
export type IconName = ComponentProps<typeof Ionicons>['name'];

const COLORS: Record<ButtonVariant, { bg: ColorTokenName | null; fg: ColorTokenName; border?: ColorTokenName }> = {
  primary: { bg: 'action-primary', fg: 'text-on-action' },
  accent: { bg: 'action-accent', fg: 'text-on-accent' },
  secondary: { bg: 'action-secondary', fg: 'text-on-secondary' },
  danger: { bg: 'action-danger', fg: 'text-on-danger' },
  ghost: { bg: null, fg: 'text-primary', border: 'border' },
};

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  /** `action` is the large thumb-zone button for the main rider step. */
  size?: 'regular' | 'action';
  icon?: IconName;
  /** Shows a spinner and blocks presses; the label stays for screen readers. */
  pending?: boolean;
  disabled?: boolean;
  /** Extra context read after the label, e.g. what the action will do. */
  hint?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Pill button with a large touch target. While `pending` it ignores presses, so a double tap
 * cannot send a command twice.
 */
export function Button({ label, onPress, variant = 'primary', size = 'regular', icon, pending, disabled, hint, style }: ButtonProps) {
  const { theme } = useTheme();
  const colors = COLORS[variant];
  const inactive = Boolean(disabled || pending);
  const fg = inactive ? 'text-disabled' : colors.fg;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      {...(hint ? { accessibilityHint: hint } : {})}
      accessibilityState={{ disabled: inactive, busy: Boolean(pending) }}
      disabled={inactive}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        {
          minHeight: size === 'action' ? theme.touch.action : theme.touch.min,
          borderRadius: theme.radius.full,
          paddingHorizontal: theme.spacing[6],
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: theme.spacing[2],
          backgroundColor: inactive ? theme.colors['surface-disabled'] : colors.bg ? theme.colors[colors.bg] : 'transparent',
          borderWidth: colors.border ? 1.5 : 0,
          borderColor: colors.border ? theme.colors[colors.border] : 'transparent',
          opacity: pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {pending ? (
        <ActivityIndicator color={theme.colors[fg]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
      ) : icon ? (
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Ionicons name={icon} size={size === 'action' ? 24 : 20} color={theme.colors[fg]} />
        </View>
      ) : null}
      <AppText variant={size === 'action' ? 'heading' : 'bodyStrong'} color={fg}>{label}</AppText>
    </Pressable>
  );
}
