import { Pressable, View } from 'react-native';
import { useTheme, type ThemePreference } from '../../theme/ThemeProvider.tsx';
import { AppText } from '../../ui/AppText.tsx';

const OPTIONS: readonly { id: ThemePreference; label: string }[] = [
  { id: 'system', label: 'Sistema' },
  { id: 'light', label: 'Claro' },
  { id: 'dark', label: 'Oscuro' },
];

/** Appearance picker exposed as a radio group to screen readers. */
export function ThemeChoice() {
  const { theme, preference, setPreference } = useTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Apariencia" style={{ gap: theme.spacing[2] }}>
      <AppText variant="label" color="text-secondary">Apariencia</AppText>
      <View style={{ flexDirection: 'row', gap: theme.spacing[1], padding: theme.spacing[1], borderRadius: theme.radius.full, backgroundColor: theme.colors['surface-sunken'] }}>
        {OPTIONS.map((option) => {
          const selected = option.id === preference;
          return (
            <Pressable
              key={option.id}
              accessibilityRole="radio"
              accessibilityLabel={option.label}
              accessibilityState={{ checked: selected }}
              onPress={() => setPreference(option.id)}
              style={{
                flex: 1,
                minHeight: theme.touch.min,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: theme.radius.full,
                backgroundColor: selected ? theme.colors['selection-fill'] : 'transparent',
              }}
            >
              <AppText variant="label" color={selected ? 'selection-mark' : 'text-primary'}>{option.label}</AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
