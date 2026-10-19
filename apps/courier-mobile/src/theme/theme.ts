import { colorThemes, controlHeight, radius, spacing, typeScale, type ColorTheme, type ThemeName } from '@delivery/design-tokens';

/** Plus Jakarta Sans files registered by the app, one family per weight (React Native needs that). */
export const FONT_FAMILIES = {
  regular: 'PlusJakartaSans_400Regular',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
} as const;

export type FontWeightName = keyof typeof FONT_FAMILIES;

/**
 * Native theme built only from the shared semantic tokens; no hex values live in the app.
 * Touch targets are larger than web: riders use the app with gloves and one hand.
 */
export interface AppTheme {
  readonly name: ThemeName;
  readonly colors: ColorTheme;
  readonly spacing: typeof spacing;
  readonly radius: typeof radius;
  readonly type: typeof typeScale;
  readonly fonts: typeof FONT_FAMILIES;
  /** Minimum height of any pressable; primary rider actions use `action`. */
  readonly touch: { readonly min: number; readonly action: number };
}

export function buildTheme(name: ThemeName): AppTheme {
  return {
    name,
    colors: colorThemes[name],
    spacing,
    radius,
    type: typeScale,
    fonts: FONT_FAMILIES,
    touch: { min: Math.max(controlHeight.md, 48), action: 64 },
  };
}
