import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import { useTheme } from '../theme/ThemeProvider.tsx';
import { AppText } from './AppText.tsx';
import type { IconName } from './Button.tsx';

export interface TextFieldProps extends Pick<TextInputProps, 'autoComplete' | 'keyboardType' | 'textContentType' | 'secureTextEntry' | 'returnKeyType' | 'onSubmitEditing'> {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  icon: IconName;
  description?: string;
  error?: string | null;
  disabled?: boolean;
}

/** Labeled input with icon, help and error text; the label is also its accessible name. */
export function TextField({ label, value, onChangeText, icon, description, error, disabled, ...input }: TextFieldProps) {
  const { theme } = useTheme();
  const [focused, setFocused] = useState(false);
  const border = error ? theme.colors['feedback-danger-fg'] : focused ? theme.colors['focus-ring'] : theme.colors.border;
  return (
    <View style={{ gap: theme.spacing[1.5] }}>
      <AppText variant="label">{label}</AppText>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing[3],
          minHeight: theme.touch.min + 4,
          paddingHorizontal: theme.spacing[4],
          borderRadius: theme.radius.md,
          borderWidth: focused || error ? 2 : 1.5,
          borderColor: border,
          backgroundColor: disabled ? theme.colors['surface-disabled'] : theme.colors.surface,
        }}
      >
        <Ionicons name={icon} size={20} color={theme.colors['text-secondary']} accessibilityElementsHidden importantForAccessibility="no" />
        <TextInput
          accessibilityLabel={label}
          {...(description || error ? { accessibilityHint: error ?? description } : {})}
          value={value}
          onChangeText={onChangeText}
          editable={!disabled}
          autoCapitalize="none"
          autoCorrect={false}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholderTextColor={theme.colors['text-disabled']}
          maxFontSizeMultiplier={1.6}
          style={{ flex: 1, minHeight: theme.touch.min, color: theme.colors['text-primary'], fontFamily: theme.fonts.regular, fontSize: theme.type.md.size }}
          {...input}
        />
      </View>
      {error ? (
        <AppText variant="caption" color="feedback-danger-fg">{error}</AppText>
      ) : description ? (
        <AppText variant="caption" color="text-secondary">{description}</AppText>
      ) : null}
    </View>
  );
}
